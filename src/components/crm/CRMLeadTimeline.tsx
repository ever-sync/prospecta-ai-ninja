import { Badge } from '@/components/ui/badge';
import { CRMLeadTimelineItem } from '@/types/crm';
import { cn } from '@/lib/utils';
import { formatCRMDateTime } from '@/lib/crm/deriveLeadState';

type CRMLeadTimelineProps = {
  items: CRMLeadTimelineItem[];
};

const toneClasses: Record<CRMLeadTimelineItem['tone'], string> = {
  neutral: 'bg-[#f4f4f7] text-[#5f5f67] border-[#e6e6eb]',
  positive: 'bg-[#eefbf3] text-[#1f8f47] border-[#cdebd7]',
  warning: 'bg-[#fff8ef] text-[#9a5a10] border-[#f1d3a5]',
  danger: 'bg-[#fff1f3] text-[#b12539] border-[#f6c3ca]',
};

export const CRMLeadTimeline = ({ items }: CRMLeadTimelineProps) => {
  if (items.length === 0) {
    return <p className="text-sm text-[#6f6f77]">Sem eventos ainda para esse lead.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-[18px] border border-[#ececf0] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-[#1A1A1A]">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#67676f]">{item.description}</p>
            </div>
            <Badge className={cn('rounded-full border', toneClasses[item.tone])}>{formatCRMDateTime(item.at)}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
};
