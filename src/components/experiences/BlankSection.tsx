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

const rowGapMap: Record<string, string> = {
  none: 'gap-0 mb-0',
  small: 'gap-2 mb-2',
  medium: 'gap-4 mb-4',
  large: 'gap-8 mb-8',
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

type BlankSectionProps = {
  content: ContentProps<typeof BlankSectionContentType>;
  displaySettings?: ContentProps<typeof BlankSectionDisplayTemplate>;
};

export default function BlankSection({ content, displaySettings }: BlankSectionProps) {
  const { pa } = getPreviewUtils(content);

  const sectionSpacing = sectionSpacingMap[displaySettings?.sectionSpacing ?? 'medium'];
  const rowGap = displaySettings?.rowGap ?? 'medium';
  const colGap = displaySettings?.columnGap ?? 'medium';
  const elemGap = displaySettings?.elementGap ?? 'medium';

  return (
    <section
      className={`vb:grid relative w-full ${sectionSpacing} px-4 md:px-6 lg:px-8 overflow-visible`}
      {...pa(content)}
    >
      <div className="max-w-7xl mx-auto w-full">
        <OptimizelyGridSection
          nodes={content.nodes}
          row={(props) => <Row {...props} gap={rowGap} colGap={colGap} />}
          column={(props) => <Column {...props} gap={elemGap} />}
        />
      </div>
    </section>
  );
}

function Row({ children, node, gap, colGap }: StructureContainerProps & { gap: string; colGap: string }) {
  const { pa } = getPreviewUtils(node);
  const gapClasses = rowGapMap[gap];
  const colGapClasses = columnGapMap[colGap];
  return (
    <div
      className={`vb:row flex flex-row ${colGapClasses} ${gapClasses} last:mb-0`}
      {...pa(node)}
    >
      {children}
    </div>
  );
}

function Column({ children, node, gap }: StructureContainerProps & { gap: string }) {
  const { pa } = getPreviewUtils(node);
  const gapClasses = elementGapMap[gap];
  return (
    <div
      className={`vb:col flex-1 flex flex-col ${gapClasses} min-w-0`}
      {...pa(node)}
    >
      {children}
    </div>
  );
}
