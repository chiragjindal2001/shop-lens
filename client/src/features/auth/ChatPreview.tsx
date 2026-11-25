import { Icon } from '../../components/ui/icons';
import { LogoMark } from '../../components/ui/Logo';

/**
 * A static picture of the assistant answering a question, shown on the sign-in panel so a visitor sees the
 * product before logging in. No API calls and nothing to click: it is hidden from screen readers.
 */
export function ChatPreview() {
  return (
    <div aria-hidden="true" className="w-full rounded-3xl bg-black/20 p-6 shadow-2xl ring-1 ring-white/25 select-none">
      <p className="text-xs font-semibold tracking-wider uppercase">The assistant in action</p>

      <div className="mt-5 flex justify-end">
        <div className="rounded-2xl rounded-br-md bg-white px-4 py-2.5 text-[15px] font-medium text-slate-900 shadow-sm">Where's my order SE1041?</div>
      </div>

      <div className="mt-4 flex items-start gap-3">
        <LogoMark size={30} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1 text-xs font-medium">
            <Icon name="check" size={13} strokeWidth={2.4} />
            Checked your orders
          </span>
          <div className="mt-2 rounded-2xl rounded-tl-md bg-black/25 px-4 py-3 text-[15px] leading-relaxed">
            It's shipped and should arrive in 2 days. Want me to share the tracking details?
          </div>
        </div>
      </div>
    </div>
  );
}
