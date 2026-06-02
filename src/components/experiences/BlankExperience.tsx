import { cloneElement, isValidElement } from 'react';
import { BlankExperienceContentType, ContentProps } from '@optimizely/cms-sdk';
import {
  ComponentContainerProps,
  OptimizelyComposition,
  getPreviewUtils,
} from '@optimizely/cms-sdk/react/server';

type Props = {
  content: ContentProps<typeof BlankExperienceContentType>;
};

// OptimizelyComposition passes a component node's parsed displaySettings to this
// wrapper but NOT to the inner <OptimizelyComponent> it renders as `children`
// (unlike OptimizelyGridSection, which forwards them). So a component placed
// directly in an experience — e.g. a HeroBlock — would never receive its
// display template settings and would fall back to defaults (Hero stays dark,
// background-image surface unselectable). Re-inject displaySettings onto the
// child element so leaf components get them on the experience path too.
function ComponentWrapper({ children, node, displaySettings }: ComponentContainerProps) {
  const { pa } = getPreviewUtils(node);
  const child = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ displaySettings?: unknown }>, { displaySettings })
    : children;
  return <div className="mb-2" {...pa(node)}>{child}</div>;
}

export default function BlankExperience({ content }: Props) {
  return (
    <main className="blank-experience">
      <OptimizelyComposition
        nodes={content.composition?.nodes ?? []}
        ComponentWrapper={ComponentWrapper}
      />
    </main>
  );
}
