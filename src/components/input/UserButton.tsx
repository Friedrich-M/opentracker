import {
  Button,
  Column,
  Icon,
  Menu,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Popover,
  Row,
  SubmenuTrigger,
  Text,
  useTheme,
} from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useLocale, useLoginQuery, useMessages, useMobile } from '@/components/hooks';
import {
  ExternalLink,
  Globe,
  LockKeyhole,
  LogOut,
  Moon,
  Settings,
  Sun,
  SunMoon,
  UserCircle,
} from '@/components/icons';
import { languages } from '@/lib/lang';

interface UserButtonProps {
  showText?: boolean;
  onClose?: () => void;
}

export function UserButton({ showText = true, onClose }: UserButtonProps) {
  const { user } = useLoginQuery();
  const { t, labels } = useMessages();
  const { locale, saveLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useMobile();
  const router = useRouter();

  const handleNavigate = (url: string, target?: string) => {
    onClose?.();

    if (target) {
      window.open(url, target);
    } else if (url.startsWith('http')) {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };

  const handleSelectLocale = (key: string) => {
    saveLocale(key);
    onClose?.();
  };

  const handleSelectTheme = (key: 'light' | 'dark') => {
    setTheme(key);
    onClose?.();
  };

  const languageItems = Object.keys(languages).map(key => ({
    value: key,
    label: languages[key].label,
  }));

  const items = [
    user.isAdmin && {
      id: 'admin',
      label: t(labels.admin),
      path: '/admin',
      icon: <LockKeyhole />,
    },
    {
      id: 'separator',
      separator: true,
    },
    {
      id: 'logout',
      label: t(labels.logout),
      path: '/logout',
      icon: <LogOut />,
    },
  ].filter(Boolean);

  const trigger = (
    <Button
      variant="zero"
      aria-label={showText ? undefined : user.username}
      style={{
        display: 'flex',
        padding: 0,
        width: '100%',
        flexGrow: 1,
        justifyContent: 'flex-start',
      }}
    >
      <Row
        alignItems="center"
        flexGrow={1}
        width="100%"
        hover={{ backgroundColor: 'surface-sunken' }}
        borderRadius
        minHeight="40px"
        style={{ textWrap: 'nowrap', overflow: 'hidden' }}
      >
        <Row alignItems="center" gap padding>
          <Icon>
            <UserCircle />
          </Icon>
          {showText && <Text>{user.username}</Text>}
        </Row>
      </Row>
    </Button>
  );

  const menu = (
    <MenuTrigger>
      {trigger}
      <Popover side="bottom" align="end">
        <Column>
          {/* The width is on the menu: Zen keeps this Column in the layout
              while the menu is closed, where a min-width would widen the header. */}
          <Menu style={{ minWidth: 200 }}>
            <MenuItem id="settings" onAction={() => handleNavigate('/settings')}>
              <Row alignItems="center" gap>
                <Icon>
                  <Settings />
                </Icon>
                <Text>{t(labels.settings)}</Text>
              </Row>
            </MenuItem>
            <SubmenuTrigger>
              <MenuItem id="language" showSubMenuIcon>
                <Row alignItems="center" gap>
                  <Icon>
                    <Globe />
                  </Icon>
                  <Text>{t(labels.language)}</Text>
                </Row>
              </MenuItem>
              <Popover
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'start' : 'end'}
                isNonModal
              >
                <Menu
                  selectionMode="single"
                  selectedKeys={new Set([locale])}
                  style={{ maxHeight: 300, overflow: 'auto' }}
                >
                  {languageItems.map(({ value, label }) => (
                    <MenuItem key={value} id={value} onAction={() => handleSelectLocale(value)}>
                      <Text weight={value === locale ? 'bold' : undefined}>{label}</Text>
                    </MenuItem>
                  ))}
                </Menu>
              </Popover>
            </SubmenuTrigger>
            <SubmenuTrigger>
              <MenuItem id="theme" showSubMenuIcon>
                <Row alignItems="center" gap>
                  <Icon>
                    <SunMoon />
                  </Icon>
                  <Text>{t(labels.theme)}</Text>
                </Row>
              </MenuItem>
              <Popover
                side={isMobile ? 'bottom' : 'right'}
                align={isMobile ? 'start' : 'end'}
                isNonModal
              >
                <Menu selectionMode="single" selectedKeys={new Set([theme])}>
                  <MenuItem id="light" onAction={() => handleSelectTheme('light')}>
                    <Icon>
                      <Sun />
                    </Icon>
                    <Text weight={theme === 'light' ? 'bold' : undefined}>Light</Text>
                  </MenuItem>
                  <MenuItem id="dark" onAction={() => handleSelectTheme('dark')}>
                    <Icon>
                      <Moon />
                    </Icon>
                    <Text weight={theme === 'dark' ? 'bold' : undefined}>Dark</Text>
                  </MenuItem>
                </Menu>
              </Popover>
            </SubmenuTrigger>
            {items.map(({ id, path, label, icon, separator, target, external }: any) => {
              if (separator) {
                return <MenuSeparator key={id} />;
              }

              return (
                <MenuItem key={id} id={id} onAction={() => handleNavigate(path, target)}>
                  <Row alignItems="center" gap>
                    <Icon>{icon}</Icon>
                    <Text>{label}</Text>
                    {external && (
                      <Icon color="muted" size="sm">
                        <ExternalLink />
                      </Icon>
                    )}
                  </Row>
                </MenuItem>
              );
            })}
          </Menu>
        </Column>
      </Popover>
    </MenuTrigger>
  );

  // Without its text the trigger is labelled by aria-label. A TooltipTrigger
  // around MenuTrigger renders the closed menu inline, so there is no tooltip.
  return <div style={{ width: '100%' }}>{menu}</div>;
}
