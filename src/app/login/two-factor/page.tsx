import type { Metadata } from 'next';
import { LoginPageWrapper } from '@/app/login/LoginPage';
import { LoginTwoFactorPage } from './LoginTwoFactorPage';

export default async function () {
  return (
    <LoginPageWrapper>
      <LoginTwoFactorPage />
    </LoginPageWrapper>
  );
}

export const metadata: Metadata = {
  title: 'Two-factor authentication',
};
