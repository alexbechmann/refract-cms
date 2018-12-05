import React from 'react';
import HomePage from './Home/HomePage';
import classNames from 'classnames';
import { withStyles } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import IconButton from '@material-ui/core/IconButton';
import Badge from '@material-ui/core/Badge';
import MenuIcon from '@material-ui/icons/Menu';
import ImageIcon from '@material-ui/icons/Image';
import CloudIcon from '@material-ui/icons/Cloud';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import NotificationsIcon from '@material-ui/icons/Notifications';
import ExitToApp from '@material-ui/icons/ExitToApp';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  WithStyles,
  createStyles,
  Theme,
  CircularProgress
} from '@material-ui/core';
import HomeIcon from '@material-ui/icons/Home';
import HelpIcon from '@material-ui/icons/Help';
import { Config, EntitySchema } from '@refract-cms/core';
import Graphql from './Graphql/Graphql';
import { ApolloProvider } from 'react-apollo';
import { createApolloClient } from './graphql/create-apollo-client';
import EntityList from './entities/EntityList';
import { Router, Link } from '@reach/router';
import { setBaseRoute } from './router/state/router.actions';
import { AppState } from './state/app.state';
import { connect, Provider } from 'react-redux';
import { combineContainers } from 'combine-containers';
import { configure } from './config/state/config.actions';
import { store } from './state/root.store';
import { provide } from './state/provide';
import EditEntity from './entities/EditEntity';
import 'typeface-roboto';
import FilesPage from './files/FilesPage';
import Auth from './auth/Auth';
import { checkLocalStorageForAccessToken, logout } from './auth/state/auth.actions';

const drawerWidth = 240;

const styles = (theme: Theme) =>
  createStyles({
    root: {
      display: 'flex'
    },
    toolbar: {
      paddingRight: 24 // keep right padding when drawer closed
    },
    toolbarIcon: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 8px',
      ...theme.mixins.toolbar
    },
    appBar: {
      zIndex: theme.zIndex.drawer + 1,
      transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
      })
    },
    appBarShift: {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen
      })
    },
    menuButton: {
      marginLeft: 12,
      marginRight: 36
    },
    menuButtonHidden: {
      display: 'none'
    },
    title: {
      flexGrow: 1
    },
    drawerPaper: {
      position: 'relative',
      whiteSpace: 'nowrap',
      width: drawerWidth,
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen
      })
    },
    drawerPaperClose: {
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen
      }),
      width: theme.spacing.unit * 7,
      [theme.breakpoints.up('sm')]: {
        width: theme.spacing.unit * 9
      }
    },
    appBarSpacer: theme.mixins.toolbar,
    content: {
      flexGrow: 1,
      height: '100vh',
      overflow: 'auto'
    },
    chartContainer: {
      marginLeft: -22
    },
    tableContainer: {
      height: 320
    },
    h5: {
      marginBottom: theme.spacing.unit * 2
    }
  });

interface Props
  extends DashboardProps,
    WithStyles<typeof styles>,
    MapDispatchToProps,
    ReturnType<typeof mapStateToProps> {}

export interface DashboardProps {
  config: Config;
  serverUrl: string;
  rootPath: string;
}

class Dashboard extends React.Component<Props> {
  state = {
    open: true
  };

  handleDrawerOpen = () => {
    this.setState({ open: true });
  };

  handleDrawerClose = () => {
    this.setState({ open: false });
  };

  componentDidMount() {
    const { config, serverUrl, rootPath, configure, setBaseRoute, checkLocalStorageForAccessToken } = this.props;
    checkLocalStorageForAccessToken();
    setBaseRoute(rootPath);
    configure(config, serverUrl);
  }

  render() {
    const { classes, config, serverUrl, routes, isLoggedIn, logout } = this.props;
    return !routes ? (
      <CircularProgress />
    ) : (
      <ApolloProvider client={createApolloClient({ serverUrl })}>
        <div className={classes.root}>
          <CssBaseline />
          <AppBar position="absolute" className={classNames(classes.appBar, this.state.open && classes.appBarShift)}>
            <Toolbar disableGutters={!this.state.open} className={classes.toolbar}>
              <IconButton
                color="inherit"
                aria-label="Open drawer"
                onClick={this.handleDrawerOpen}
                className={classNames(classes.menuButton, this.state.open && classes.menuButtonHidden)}
              >
                <MenuIcon />
              </IconButton>
              <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
                Refract-CMS Dashboard
              </Typography>
              <IconButton color="inherit">
                <Badge badgeContent={4} color="secondary">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Toolbar>
          </AppBar>
          <Drawer
            variant="permanent"
            classes={{
              paper: classNames(classes.drawerPaper, !this.state.open && classes.drawerPaperClose)
            }}
            open={this.state.open}
          >
            <div className={classes.toolbarIcon}>
              <IconButton onClick={this.handleDrawerClose}>
                <ChevronLeftIcon />
              </IconButton>
            </div>
            <Divider />
            <List>
              <ListItem button component={(props: any) => <Link {...props} to={routes.root.createUrl()} />}>
                <ListItemIcon>
                  <HomeIcon />
                </ListItemIcon>
                <ListItemText primary="Home" />
              </ListItem>
              <ListItem button component={(props: any) => <Link {...props} to={routes.files.createUrl()} />}>
                <ListItemIcon>
                  <ImageIcon />
                </ListItemIcon>
                <ListItemText primary="Files" />
              </ListItem>
              <ListItem button component={(props: any) => <Link {...props} to={routes.graphql.createUrl()} />}>
                <ListItemIcon>
                  <CloudIcon />
                </ListItemIcon>
                <ListItemText primary="Graphql" />
              </ListItem>
            </List>
            <Divider />
            <List>
              {config.schema.map(schema => {
                return (
                  <ListItem
                    key={schema.options.alias}
                    button
                    component={(props: any) => <Link {...props} to={routes.entity.list.createUrl(schema)} />}
                  >
                    {schema.options.icon && (
                      <ListItemIcon>
                        <schema.options.icon />
                      </ListItemIcon>
                    )}
                    <ListItemText inset primary={schema.options.displayName || schema.options.alias} />
                  </ListItem>
                );
              })}
            </List>
            <Divider />
            <List>
              <ListItem button onClick={logout}>
                <ListItemIcon>
                  <ExitToApp />
                </ListItemIcon>
                <ListItemText inset primary="Logout" />
              </ListItem>
            </List>
          </Drawer>
          <main className={classes.content}>
            <div className={classes.appBarSpacer} />
            {!isLoggedIn ? (
              <Router>
                <Auth default path="/" />
              </Router>
            ) : (
              <Router>
                <HomePage path={routes.root.path} />
                <Graphql path={routes.graphql.path} serverUrl={serverUrl} />
                <EntityList path={routes.entity.list.path} />
                <FilesPage path={routes.files.path} />
                <EditEntity path={routes.entity.edit.path} />
              </Router>
            )}
          </main>
        </div>
      </ApolloProvider>
    );
  }
}

function mapStateToProps(state: AppState) {
  return {
    entities: state.config.schema,
    routes: state.router.routes,
    isLoggedIn: Boolean(state.auth.activeUserToken)
  };
}

const mapDispatchToProps = {
  setBaseRoute,
  configure,
  checkLocalStorageForAccessToken,
  logout
};

type MapDispatchToProps = typeof mapDispatchToProps;

export default provide(store)(
  combineContainers(
    connect(
      mapStateToProps,
      mapDispatchToProps
    ),
    withStyles(styles)
  )(Dashboard)
) as React.ComponentType<DashboardProps>;