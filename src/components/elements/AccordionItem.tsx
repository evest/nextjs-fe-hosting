import { ContentProps } from '@optimizely/cms-sdk';
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server';
import { RichText } from '@optimizely/cms-sdk/react/richText';
import { ChevronDown } from 'lucide-react';
import { AccordionItemCT } from '@/content-types/AccordionItem';

type Props = { content: ContentProps<typeof AccordionItemCT> };

export default function AccordionItem({ content }: Props) {
  const { pa } = getPreviewUtils(content);

  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span className="text-base md:text-lg font-semibold" {...pa('summary')}>
          {content.summary}
        </span>
        <ChevronDown
          className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180 flex-shrink-0"
          aria-hidden
        />
      </summary>
      <div className="pb-6 pr-8 text-base text-muted-foreground prose-sm" {...pa('body')}>
        <RichText content={content.body?.json} />
      </div>
    </details>
  );
}
