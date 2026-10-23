import type { ReactElement, SVGProps } from 'react';

type IconName = 'search' | 'close' | 'menu' | 'discord' | 'enter' | 'arrow-down' | 'arrow-up-right';

const paths: Record<IconName, ReactElement> = {
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  close: <path d="M5 5l14 14M19 5 5 19" />,
  menu: <path d="M3 7h18M3 12h18M3 17h12" />,
  enter: <path d="M20 5v7a3 3 0 0 1-3 3H5m0 0 4-4m-4 4 4 4" />,
  'arrow-down': <path d="M12 4v16m0 0-6-6m6 6 6-6" />,
  'arrow-up-right': <path d="M7 17 17 7m0 0H8m9 0v9" />,
  discord: (
    <path
      fill="currentColor"
      stroke="none"
      d="M19.6 5.6A17.6 17.6 0 0 0 15.3 4.3l-.5 1.1a16.4 16.4 0 0 0-5.6 0l-.6-1.1a17.5 17.5 0 0 0-4.3 1.3C1.6 9.7.9 13.7 1.2 17.7a17.8 17.8 0 0 0 5.3 2.7l1.1-1.8a11.4 11.4 0 0 1-1.8-.9l.4-.3a12.6 12.6 0 0 0 11.4 0l.4.3c-.6.3-1.2.6-1.8.9l1.1 1.8a17.7 17.7 0 0 0 5.3-2.7c.4-4.7-.7-8.6-3-12.1ZM8.4 15.3c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Zm7.2 0c-1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z"
    />
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}
