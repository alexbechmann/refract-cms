import { PropertyType, EntitySchema, RefractTypes, PropertyOptions, Entity } from '@refract-cms/core';
import {
  GraphQLString,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLList,
  GraphQLType,
  GraphQLSchema,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInt,
  GraphQLScalarType
} from 'graphql';
import { ShapeArgs, PropertyDescription } from '@refract-cms/core';
import { merge } from 'lodash';
import mongoose from 'mongoose';
import { ServerConfig } from '../server-config.model';
import { Properties, buildHelpers } from '../create-public-schema';
import { repositoryForSchema } from '../repository-for-schema';
import { getGraphQLQueryArgs, getMongoDbQueryResolver, getMongoDbFilter } from 'graphql-to-mongodb';
import { Db, ObjectId } from 'mongodb';
import { GraphQLDate, GraphQLDateTime } from 'graphql-iso-date';
import chalk from 'chalk';
import { MongoIdType } from './mongo-id.type';

export class PublicSchemaBuilder {
  types: GraphQLObjectType[] = [];
  inputTypes: GraphQLInputObjectType[] = [];

  constructor(private serverConfig: ServerConfig) {}

  buildEntityFromSchema(
    entitySchema: EntitySchema,
    prefixName: string = '',
    addResolvers: boolean,
    suffixName: string = '',
    useExtensions: boolean = true
  ) {
    const extension = useExtensions
      ? this.serverConfig.publicGraphQL.find(extension => extension.schema.options.alias === entitySchema.options.alias)
      : null;

    const extensionProperties = extension
      ? extension.buildProperties(buildHelpers({ serverConfig: this.serverConfig, schema: entitySchema }))
      : null;

    const properties = extension ? extensionProperties : entitySchema.properties;
    const type = this.buildEntity(
      prefixName + entitySchema.options.alias + suffixName,
      properties,
      extension ? extensionProperties : null,
      addResolvers
    );
    return type;
  }

  buildSchema(schema: EntitySchema[]) {
    let queryFields = {};
    schema.forEach(entitySchema => {
      const type = this.buildEntityFromSchema(entitySchema, '', true);
      const repository = repositoryForSchema(entitySchema);

      queryFields = {
        ...queryFields,
        ...this.buildFieldQueries(entitySchema, repository, type)
      };

      console.log(chalk.green(`Added schema: ${entitySchema.options.displayName || entitySchema.options.alias}`));
    });

    const query = new GraphQLObjectType({
      name: 'Query',
      fields: queryFields
    });

    let mutationFields = {};
    schema.forEach(entitySchema => {
      const type = this.buildEntityFromSchema(entitySchema, '', true);
      const repository = repositoryForSchema(entitySchema);

      mutationFields = {
        ...mutationFields,
        ...this.buildFieldMutations(entitySchema, repository, type)
      };
    });

    const mutation = new GraphQLObjectType({
      name: 'Mutation',
      fields: mutationFields
    });

    return new GraphQLSchema({ query, mutation });
  }

  buildFieldQueries<TEntity extends Entity & mongoose.Document>(
    entitySchema: EntitySchema<TEntity>,
    repository: mongoose.Model<TEntity>,
    type: GraphQLObjectType
  ) {
    // const argsType = this.buildEntityFromSchema(entitySchema, '', false, 'Args', false);
    const entityType = this.buildEntityFromSchema(entitySchema, '', false, 'Entity', false);
    const args = getGraphQLQueryArgs(entityType);
    const resolvers = {
      [`${entitySchema.options.alias}Count`]: {
        type: GraphQLInt,
        args: {
          filter: args.filter
        },
        resolve: (_, { filter }) => repository.count(getMongoDbFilter(entityType, filter))
      },
      [`${entitySchema.options.alias}EntityFindById`]: {
        type: entityType,
        args: {
          id: { type: GraphQLString }
        },
        resolve: (_, { id }) => {
          return repository.findById(id);
        }
      },
      [`${entitySchema.options.alias}List`]: {
        type: new GraphQLList(type),
        args,
        resolve: getMongoDbQueryResolver(
          entityType,
          async (filter, projection, options, obj, args, { db }: { db: Db }) => {
            return repository
              .find(filter)
              .sort(options.sort)
              .limit(options.limit)
              .skip(options.skip);
          }
        )
      },
      [`${entitySchema.options.alias}EntityList`]: {
        type: new GraphQLList(entityType),
        args,
        resolve: getMongoDbQueryResolver(
          entityType,
          async (filter, projection, options, obj, args, { db }: { db: Db }) => {
            return repository
              .find(filter)
              .sort(options.sort)
              .limit(options.limit)
              .skip(options.skip);
          }
        )
      }
    };

    if (entitySchema.options.maxOne) {
      return {
        ...resolvers,
        [`${entitySchema.options.alias}`]: {
          type,
          args: {},
          resolve: async (obj: any, {  }: any, context: any) => {
            return repository.findOne();
          }
        }
      };
    } else {
      return {
        ...resolvers,
        [`${entitySchema.options.alias}FindById`]: {
          type,
          args: {
            id: { type: GraphQLString }
          },
          resolve: (_, { id }) => {
            return repository.findById(id);
          }
        }
      };
    }
  }

  buildFieldMutations<TEntity extends Entity & mongoose.Document>(
    entitySchema: EntitySchema<TEntity>,
    repository: mongoose.Model<TEntity>,
    type: GraphQLObjectType
  ) {
    const inputType = this.buildInput(`${entitySchema.options.alias}Input`, entitySchema.properties);
    return {
      [`${entitySchema.options.alias}Create`]: {
        type,
        args: {
          record: { type: inputType }
        },
        resolve: (_, { record }, { userId }) => {
          if (!userId) {
            return null;
          }
          return repository.create(record);
        }
      },
      [`${entitySchema.options.alias}Update`]: {
        type,
        args: {
          record: { type: inputType }
        },
        resolve: (_, { record }, { userId }) => {
          if (!userId || !record._id) {
            return null;
          }
          return repository.findByIdAndUpdate(record._id, record);
        }
      },
      [`${entitySchema.options.alias}RemoveById`]: {
        type: GraphQLBoolean,
        args: {
          id: { type: GraphQLString }
        },
        resolve: async (_, { id }, { userId }) => {
          if (!userId) {
            return null;
          }
          await repository.findByIdAndDelete(id);
          return true;
        }
      }
    };
  }

  buildType<T>(propertyName: string, propertyType: PropertyType<T>): GraphQLType {
    switch (propertyType.alias) {
      case 'String': {
        return GraphQLString;
      }
      case 'Date': {
        return GraphQLDateTime;
      }
      case 'Number': {
        return GraphQLFloat;
      }
      case 'Boolean': {
        return GraphQLBoolean;
      }
      case 'Shape': {
        return this.buildShape(propertyName, propertyType as PropertyDescription<T, 'Shape', ShapeArgs<T>>);
      }
      case 'Array': {
        const type = this.buildType(propertyName, propertyType.meta);
        return new GraphQLList(type);
      }
      // @ts-ignore
      case 'SchemaType': {
        // @ts-ignore
        return this.buildEntityFromSchema(propertyType.meta, '');
      }
      // case 'Ref': {
      //   const shapeArgs = Object.keys(propertyType.meta.properties).reduce((acc, propertKey) => {
      //     acc[propertKey] = propertyType.meta.properties[propertKey].type;
      //     return acc;
      //   }, {}) as any;

      //   const shape = RefractTypes.shape(shapeArgs);
      //   return this.buildShape(propertyName, shape);
      // }
      default: {
        return GraphQLString;
      }
    }
  }

  buildInputType<T>(propertyName: string, propertyType: PropertyType<T>): GraphQLInputType {
    switch (propertyType.alias) {
      case 'String': {
        return GraphQLString;
      }
      case 'Date': {
        return GraphQLDateTime;
      }
      case 'Number': {
        return GraphQLFloat;
      }
      case 'Boolean': {
        return GraphQLBoolean;
      }
      case 'Shape': {
        return this.buildShapeInput(propertyName, propertyType as PropertyDescription<T, 'Shape', ShapeArgs<T>>);
      }
      case 'Array': {
        const type = this.buildInputType(propertyName, propertyType.meta);
        return new GraphQLList(type);
      }
      // @ts-ignore
      case 'SchemaType': {
        // @ts-ignore
        return this.buildEntityFromSchema(propertyType.meta, '');
      }
      // case 'Ref': {
      //   const shapeArgs = Object.keys(propertyType.meta.properties).reduce((acc, propertKey) => {
      //     acc[propertKey] = propertyType.meta.properties[propertKey].type;
      //     return acc;
      //   }, {}) as any;

      //   const shape = RefractTypes.shape(shapeArgs);
      //   return this.buildShape(propertyName, shape);
      // }
      default: {
        return GraphQLString;
      }
    }
  }

  buildInput<T extends Entity>(
    alias: string,
    properties: {
      [key: string]: PropertyOptions;
    }
  ) {
    const shapeArgs = Object.keys(properties).reduce((acc, propertKey) => {
      acc[propertKey] = properties[propertKey].type;
      return acc;
    }, {}) as any;

    const shape = RefractTypes.shape(shapeArgs);

    const existingType = this.types.find(t => t.name === alias);

    if (existingType) {
      return existingType;
    }

    const inputTypes = new GraphQLInputObjectType({
      name: alias,
      fields: () =>
        Object.keys(shape.meta!).reduce(
          (acc, propertyKey) => {
            const propertyType: PropertyDescription<any, any, any> = shape.meta![propertyKey];
            const type = this.buildInputType(`${alias}${propertyKey}`, propertyType);
            acc[propertyKey] = {
              type
            };
            return acc;
          },
          {
            _id: {
              type: MongoIdType
            }
          }
        )
    });

    this.inputTypes.push(inputTypes);
    return inputTypes;
  }

  buildEntity<T extends Entity>(
    alias: string,
    properties: {
      [key: string]: PropertyOptions;
    },
    extensionProperties?: Properties<any, T>,
    addResolvers?: boolean
  ) {
    const shapeArgs = Object.keys(properties).reduce((acc, propertKey) => {
      acc[propertKey] = properties[propertKey].type;
      return acc;
    }, {}) as any;

    const shape = RefractTypes.shape(shapeArgs);

    const existingType = this.types.find(t => t.name === alias);

    if (existingType) {
      return existingType;
    }

    const type = new GraphQLObjectType({
      name: alias,
      fields: () =>
        Object.keys(shape.meta!).reduce(
          (acc, propertyKey) => {
            const propertyType: PropertyDescription<any, any, any> = shape.meta![propertyKey];
            const type = this.buildType(`${alias}${propertyKey}`, propertyType);
            acc[propertyKey] = {
              // @ts-ignore
              type
            };
            if (addResolvers && extensionProperties && extensionProperties[propertyKey]) {
              acc[propertyKey].resolve = extensionProperties[propertyKey].resolve;
              // @ts-ignore
              acc[propertyKey].dependencies = [];
            }
            // if (propertyType.alias === 'Ref') {
            //   const refEntitySchema: EntitySchema = propertyType.meta;
            //   acc[propertyKey].resolve = entity => {
            //     const ref = entity[propertyKey];
            //     if (ref) {
            //       return mongoose.models[refEntitySchema.options.alias].findById({ id: entity[propertyKey].entityId });
            //     } else {
            //       return null;
            //     }
            //   };
            // }
            return acc;
          },
          {
            _id: {
              type: MongoIdType
            }
          }
        )
    });

    this.types.push(type);

    return type;
  }

  buildShape<T>(propertyName: string, propertyType: PropertyDescription<T, 'Shape', ShapeArgs<T>>) {
    return new GraphQLObjectType({
      name: propertyName,
      fields: Object.keys(propertyType.meta!).reduce((acc, propertyKey) => {
        const type = this.buildType(`${propertyName}${propertyKey}`, propertyType.meta![propertyKey]);
        acc[propertyKey] = {
          type
        };
        return acc;
      }, {})
    });
  }

  buildShapeInput<T>(propertyName: string, propertyType: PropertyDescription<T, 'Shape', ShapeArgs<T>>) {
    return new GraphQLInputObjectType({
      name: propertyName,
      fields: Object.keys(propertyType.meta!).reduce((acc, propertyKey) => {
        const type = this.buildInputType(`${propertyName}${propertyKey}`, propertyType.meta![propertyKey]);
        acc[propertyKey] = {
          type
        };
        return acc;
      }, {})
    });
  }
}
