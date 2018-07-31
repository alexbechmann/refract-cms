import * as React from 'react';
import { getEntitiesWithMetadata } from '../schema/get-entities-with-metadata';
import { PropertyOptions } from '../schema/property-options';
import { Tabs, Tab } from '@material-ui/core';
import { Route, RouteComponentProps, withRouter } from 'react-router';
import { routes } from '../routes/routes';
import { combineContainers } from 'combine-containers';
import { AppState } from '../state/app.state';
import { connect } from 'react-redux';
import EntityForm from '../entities/EntityForm';

export interface DashboardProps {
  entities: any[];
}

interface State {
  tabIndex: number;
}

interface Props extends DashboardProps, RouteComponentProps<{}> {}

class Dashboard extends React.Component<Props, State> {
  state: State = {
    tabIndex: 0
  };

  render() {
    const { entities } = this.props;
    return (
      <div>
        <Tabs
          value={this.state.tabIndex}
          onChange={(e, tabIndex) => {
            this.setState({
              tabIndex
            });
            this.props.history.push(routes.entityRoot.url(this.props.match, entities[tabIndex].options.alias));
          }}
        >
          {entities.map(entity => (
            <Tab key={entity.options.alias} label={entity.options.displayName || entity.options.alias} />
          ))}
        </Tabs>
        {entities.map(entity => {
          return (
            <Route
              key={entity.options.alias}
              exact
              path={routes.entityRoot.path(this.props.match, entity.options.alias)}
              component={() => <EntityForm entity={entity} />}
            />
          );
        })}
      </div>
    );
  }
}

function mapStateToProps(state: AppState): DashboardProps {
  return {
    entities: state.config.entities
  };
}

export default combineContainers(withRouter, connect(mapStateToProps))(Dashboard) as React.ComponentType;
