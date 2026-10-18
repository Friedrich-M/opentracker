import { Grid } from '@umami/react-zen';

const LAYOUTS = {
  one: { columns: '1fr' },
  two: {
    columns: {
      base: '1fr',
      md: 'repeat(auto-fill, minmax(420px, 1fr))',
    },
  },
  three: {
    columns: {
      base: '1fr',
      md: 'repeat(auto-fill, minmax(320px, 1fr))',
    },
  },
  'one-two': { columns: { base: '1fr', md: 'repeat(3, 1fr)' } },
  'two-one': { columns: { base: '1fr', md: 'repeat(3, 1fr)' } },
};

export function GridRow(props: {
  layout?: 'one' | 'two' | 'three' | 'one-two' | 'two-one' | 'compare';
  className?: string;
  children?: any;
}) {
  const { layout = 'two', children, ...otherProps } = props;
  return (
    // A frame of hairline cells (global.css, .frame-grid), as opencode rules
    // its sections rather than spacing out cards.
    <Grid className="frame-grid" {...LAYOUTS[layout]} {...otherProps}>
      {children}
    </Grid>
  );
}
