import Link from '@/components/common/Link';

// A port of opencode's DocsSidebar (services/www/src/docs/components/
// DocsSidebar.astro): titled groups of plain links, the current page marked
// with aria-current. Styled by .docs-sidebar in src/app/opencode.css.

interface NavMenuData {
  id: string;
  label: string;
  icon?: any;
  path: string;
}

interface NavMenuItems {
  label?: string;
  items: NavMenuData[];
}

interface NavMenuProps {
  items: NavMenuItems[];
  selectedKey?: string;
  /** A first, untitled link out of this section, e.g. back to the websites. */
  back?: { href: string; label: string };
  onItemClick?: () => void;
}

export function NavMenu({ items = [], selectedKey, back, onItemClick }: NavMenuProps) {
  return (
    <nav className="docs-sidebar">
      {back && (
        <section>
          <ul>
            <li>
              <Link href={back.href} onClick={onItemClick}>
                ← {back.label}
              </Link>
            </li>
          </ul>
        </section>
      )}
      {items.map(({ label, items }, index) => (
        <section key={`${label}${index}`}>
          {label && <h2>{label}</h2>}
          <ul>
            {items.map(({ id, label, path }) => (
              <li key={id}>
                <Link
                  href={path}
                  aria-current={selectedKey === id ? 'page' : undefined}
                  onClick={onItemClick}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
