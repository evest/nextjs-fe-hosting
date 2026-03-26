import { BlankSectionContentType, ContentProps } from '@optimizely/cms-sdk';
import {
  OptimizelyGridSection,
  getPreviewUtils,
  StructureContainerProps,
} from '@optimizely/cms-sdk/react/server';
import { BlankSectionDisplayTemplate } from '@/display-templates/BlankSectionDisplayTemplate';

const sectionSpacingMap: Record<string, string> = {
  none: 'py-0',
  small: 'py-4',
  medium: 'py-8',
  large: 'py-16',
};

const colorSchemeMap: Record<string, string> = {
  light: '',
  dark: 'section-dark bg-background text-foreground',
  muted: 'section-muted bg-background text-foreground',
};

const rowSpacingMap: Record<string, string> = {
  none: 'mb-0',
  small: 'mb-2',
  medium: 'mb-4',
  large: 'mb-8',
};

const rowGapMap: Record<string, string> = {
  none: 'gap-0',
  small: 'gap-2',
  medium: 'gap-4',
  large: 'gap-8',
};

const columnGapMap: Record<string, string> = {
  none: 'gap-0',
  small: 'gap-2',
  medium: 'gap-4',
  large: 'gap-8',
};

const elementGapMap: Record<string, string> = {
  none: 'gap-0',
  small: 'gap-1',
  medium: 'gap-3',
  large: 'gap-6',
};

const verticalAlignmentMap: Record<string, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const columnPaddingMap: Record<string, string> = {
  none: 'p-0',
  small: 'p-2',
  medium: 'p-4',
  large: 'p-8',
};

type BlankSectionProps = {
  content: ContentProps<typeof BlankSectionContentType>;
  displaySettings?: ContentProps<typeof BlankSectionDisplayTemplate>;
};

export default function BlankSection({ content, displaySettings }: BlankSectionProps) {
  const { pa } = getPreviewUtils(content);

  const sectionSpacing = sectionSpacingMap[displaySettings?.sectionSpacing ?? 'medium'];
  const colorScheme = colorSchemeMap[displaySettings?.colorScheme ?? 'light'];
  const colGap = displaySettings?.columnGap ?? 'medium';
  const elemGap = displaySettings?.elementGap ?? 'medium';

  return (
    <section
      className={`vb:grid relative w-full ${sectionSpacing} ${colorScheme} px-4 md:px-6 lg:px-8 overflow-visible`}
      {...pa(content)}
    >
      <div className="max-w-7xl mx-auto w-full">
        <OptimizelyGridSection
          nodes={content.nodes}
          row={(props) => <Row {...props} colGap={colGap} />}
          column={(props) => <Column {...props} elemGap={elemGap} />}
        />
      </div>
    </section>
  );
}

function Row({ children, node, displaySettings, colGap }: StructureContainerProps & { colGap: string }) {
  const { pa } = getPreviewUtils(node);
  const rowSpacing = rowSpacingMap[displaySettings?.rowSpacing as string ?? 'medium'];
  const colGapClasses = columnGapMap[colGap];
  const verticalAlignment = verticalAlignmentMap[displaySettings?.verticalAlignment as string ?? 'start'];
  return (
    <div
      className={`vb:row flex flex-row ${colGapClasses} ${rowSpacing} ${verticalAlignment} last:mb-0`}
      {...pa(node)}
    >
      {children}
    </div>
  );
}

function Column({ children, node, displaySettings, elemGap }: StructureContainerProps & { elemGap: string }) {
  const { pa } = getPreviewUtils(node);
  const gapClasses = elementGapMap[elemGap];
  const padding = columnPaddingMap[displaySettings?.columnSpacing as string ?? 'none'];
  const hideOnMobile = displaySettings?.hideOnMobile === 'hide' ? 'hidden md:flex' : 'flex';
  const hideOnTablet = displaySettings?.hideOnTablet === 'hide' ? 'md:hidden lg:flex' : '';
  return (
    <div
      className={`vb:col flex-1 flex-col ${gapClasses} ${padding} ${hideOnMobile} ${hideOnTablet} min-w-0`}
      {...pa(node)}
    >
      {children}
    </div>
  );
}
