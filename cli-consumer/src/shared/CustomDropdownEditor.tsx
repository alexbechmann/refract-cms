import React from 'react';
import { PropertyEditorProps } from '@refract-cms/core';
import { Typography, Theme } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';

const useStyles = makeStyles((theme: Theme) => ({
  highlightedText: {
    color: theme.palette.secondary.main,
    fontWeight: 500
  }
}));

type Source = { requiredForCustomDropdownEditor: string };

export default ({ value, setValue, source }: PropertyEditorProps<number, Source>) => {
  const classes = useStyles({});
  return (
    <div>
      <Typography className={classes.highlightedText} gutterBottom>
        This is an example of using current theme to render text with secondary color.
        <br />
        Other property on source: {source.requiredForCustomDropdownEditor}
      </Typography>

      <select value={value} onChange={e => setValue(parseInt(e.target.value, 10))}>
        <option>1</option>
        <option>2</option>
        <option>3</option>
      </select>
    </div>
  );
};
