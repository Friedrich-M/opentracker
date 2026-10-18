import NextLink from 'next/link';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

type LinkProps = ComponentPropsWithoutRef<typeof NextLink>;

const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ prefetch, ...props }, ref) {
  return <NextLink ref={ref} prefetch={prefetch} {...props} />;
});

export default Link;
