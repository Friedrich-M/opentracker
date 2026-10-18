import { Column, Grid, Heading, Icon, Row, Text } from '@umami/react-zen';
import type { ReactNode } from 'react';
import { canDrawPixelText } from '@/lib/pixel-glyphs';
import { LinkButton } from './LinkButton';
import { PixelWordmark } from './PixelWordmark';

export function PageHeader({
  title,
  description,
  label,
  icon,
  showBorder = true,
  titleHref,
  wordmark,
  below,
  children,
}: {
  title: string;
  description?: string;
  label?: ReactNode;
  icon?: ReactNode;
  showBorder?: boolean;
  titleHref?: string;
  /** Draw the title in opencode's logo style when every character has a glyph. */
  wordmark?: boolean;
  /** Rendered under the title, e.g. a row of view tabs. */
  below?: ReactNode;
  allowEdit?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const heading = (
    <Heading className="page-title">
      {wordmark && canDrawPixelText(title) ? (
        <PixelWordmark text={title} className="page-wordmark" />
      ) : (
        title
      )}
    </Heading>
  );

  return (
    <Grid
      columns={{ base: '1fr', md: '1fr 1fr' }}
      paddingY="6"
      marginBottom="6"
      border={showBorder ? 'bottom' : undefined}
    >
      <Column gap="2">
        {label}
        <Row alignItems="center" gap="3">
          {icon && (
            <Icon size="md" color="muted">
              {icon}
            </Icon>
          )}
          {title && titleHref ? (
            // No button padding: the title sits a gap from the icon, not a button's width.
            <LinkButton href={titleHref} variant="quiet" style={{ padding: 0, height: 'auto' }}>
              {heading}
            </LinkButton>
          ) : (
            title && heading
          )}
        </Row>
        {description && (
          <Text color="muted" truncate style={{ maxWidth: 600 }} title={description}>
            {description}
          </Text>
        )}
        {below}
      </Column>
      <Row justifyContent="flex-end" alignItems="center">
        {children}
      </Row>
    </Grid>
  );
}
