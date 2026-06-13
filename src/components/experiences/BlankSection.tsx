import { BlankSectionContentType, ContentProps } from '@optimizely/cms-sdk';
import {
  OptimizelyGridSection,
  getPreviewUtils,
  StructureContainerProps,
} from '@optimizely/cms-sdk/react/server';
import { cva } from 'class-variance-authority';
import { BlankSectionDisplayTemplate } from '@/display-templates/BlankSectionDisplayTemplate';

type Spacing = 'none' | 'small' | 'medium' | 'large';
type ColorScheme = 'light' | 'dark' | 'muted';
type VerticalAlignment = 'start' | 'center' | 'end' | 'stretch';
type Padding = 'none' | 'small' | 'medium' | 'large';
type Visibility = 'show' | 'hide';

const sectionVariants = cva(
  'vb:grid relative w-full px-4 md:px-6 lg:px-8 overflow-visible',
  {
    variants: {
      sectionSpacing: {
        none: 'py-0',
        small: 'py-4',
        medium: 'py-8',
        large: 'py-16',
      },
      colorScheme: {
        light: '',
        dark: 'section-dark bg-background text-foreground',
        muted: 'section-muted bg-background text-foreground',
      },
    },
  }
);

const rowVariants = cva('vb:row flex flex-col md:flex-row last:mb-0', {
  variants: {
    columnGap: {
      none: 'gap-0',
      small: 'gap-2',
      medium: 'gap-4',
      large: 'gap-8',
    },
    rowSpacing: {
      none: 'mb-0',
      small: 'mb-2',
      medium: 'mb-4',
      large: 'mb-8',
    },
    verticalAlignment: {
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
      stretch: 'items-stretch',
    },
  },
});

const columnVariants = cva('vb:col w-full md:flex-1 flex-col min-w-0', {
  variants: {
    elementGap: {
      none: 'gap-0',
      small: 'gap-1',
      medium: 'gap-3',
      large: 'gap-6',
    },
    columnPadding: {
      none: 'p-0',
      small: 'p-2',
      medium: 'p-4',
      large: 'p-8',
    },
    hideOnMobile: {
      show: 'flex',
      hide: 'hidden md:flex',
    },
    hideOnTablet: {
      show: '',
      hide: 'md:hidden lg:flex',
    },
  },
});

type BlankSectionProps = {
  content: ContentProps<typeof BlankSectionContentType>;
  displaySettings?: ContentProps<typeof BlankSectionDisplayTemplate>;
};

export default function BlankSection({ content, displaySettings }: BlankSectionProps) {
  const { pa } = getPreviewUtils(content);

  const sectionSpacing = (displaySettings?.sectionSpacing ?? 'medium') as Spacing;
  const colorScheme = (displaySettings?.colorScheme ?? 'light') as ColorScheme;
  const columnGap = (displaySettings?.columnGap ?? 'medium') as Spacing;
  const elementGap = (displaySettings?.elementGap ?? 'medium') as Spacing;

  return (
    <section className={sectionVariants({ sectionSpacing, colorScheme })} {...pa(content)}>
      <div className="max-w-7xl mx-auto w-full">
        <OptimizelyGridSection
          nodes={content.nodes}
          row={(props) => <Row {...props} columnGap={columnGap} />}
          column={(props) => <Column {...props} elementGap={elementGap} />}
        />
      </div>
    </section>
  );
}

function Row({
  children,
  node,
  displaySettings,
  columnGap,
}: StructureContainerProps & { columnGap: Spacing }) {
  const { pa } = getPreviewUtils(node);
  const rowSpacing = (displaySettings?.rowSpacing ?? 'medium') as Spacing;
  const verticalAlignment = (displaySettings?.verticalAlignment ?? 'start') as VerticalAlignment;
  return (
    <div className={rowVariants({ columnGap, rowSpacing, verticalAlignment })} {...pa(node)}>
      {children}
    </div>
  );
}

function Column({
  children,
  node,
  displaySettings,
  elementGap,
}: StructureContainerProps & { elementGap: Spacing }) {
  const { pa } = getPreviewUtils(node);
  const columnPadding = (displaySettings?.columnSpacing ?? 'none') as Padding;
  const hideOnMobile = (displaySettings?.hideOnMobile ?? 'show') as Visibility;
  const hideOnTablet = (displaySettings?.hideOnTablet ?? 'show') as Visibility;
  return (
    <div
      className={columnVariants({ elementGap, columnPadding, hideOnMobile, hideOnTablet })}
      {...pa(node)}
    >
      {children}
    </div>
  );
}
