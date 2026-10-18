'use client';
import { Alert, AlertTitle, Column, type ColumnProps, Loading } from '@umami/react-zen';
import type { ReactNode } from 'react';
import { useMessages } from '@/components/hooks';

// <main> (opencode.css) supplies the padding; pages fill the column.
const DEFAULT_WIDTH = '100%';

export function PageBody({
  maxWidth = DEFAULT_WIDTH,
  error,
  isLoading,
  children,
  ...props
}: {
  maxWidth?: string;
  error?: unknown;
  isLoading?: boolean;
  children?: ReactNode;
} & ColumnProps) {
  const { t, messages } = useMessages();

  if (error) {
    return (
      <Alert variant="danger">
        <AlertTitle>{t(messages.error)}</AlertTitle>
      </Alert>
    );
  }

  if (isLoading) {
    return <Loading placement="absolute" />;
  }

  return (
    <Column
      {...props}
      width="100%"
      minHeight="100vh"
      paddingBottom="6"
      maxWidth={maxWidth}
      style={{ margin: '0 auto' }}
    >
      {children}
    </Column>
  );
}
