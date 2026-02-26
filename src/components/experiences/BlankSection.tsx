import { BlankSectionContentType, ContentProps } from '@optimizely/cms-sdk';
import {
  OptimizelyGridSection,
  getPreviewUtils,
  StructureContainerProps,
} from '@optimizely/cms-sdk/react/server';


type BlankSectionProps = {
  content: ContentProps<typeof BlankSectionContentType>;
};

/** Defines a component to render a blank section */
export default function BlankSection({ content }: BlankSectionProps) {
  const { pa } = getPreviewUtils(content)
  return (
    <section
      className="vb:grid relative w-full py-12 px-4 md:px-6 lg:px-8 overflow-visible"
      {...pa(content)}
    >
      <div className="max-w-7xl mx-auto w-full">
        <OptimizelyGridSection nodes={content.nodes} row={Row} column={Column} />
      </div>
    </section>
  )
}

function Row({ children, node }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node)
  return (
    <div
      className="vb:row flex flex-row gap-6 lg:gap-8 mb-6 last:mb-0"
      {...pa(node)}
    >
      {children}
    </div>
  )
}

function Column({ children, node }: StructureContainerProps) {
  const { pa } = getPreviewUtils(node)
  return (
    <div
      className="vb:col flex-1 flex flex-col gap-4 min-w-0"
      {...pa(node)}
    >
      {children}
    </div>
  )
}


