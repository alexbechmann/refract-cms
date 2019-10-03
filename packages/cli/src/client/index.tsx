import React from 'react';
import { render } from 'react-dom';
import { Dashboard } from '@refract-cms/dashboard';
import configImport from '@consumer/config/refract.config';
// import 'typeface-roboto';
import { createMuiTheme } from '@material-ui/core';
import { ThemeProvider } from '@material-ui/styles';
import { CliConfig } from '@refract-cms/cli';

const config = configImport as CliConfig;
const path = config.path || '';

render(
  <ThemeProvider theme={config.theme}>
    <Dashboard config={config} rootPath={path} serverUrl={path} />
  </ThemeProvider>,
  document.getElementById('root')
);
