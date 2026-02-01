import { TrendingUp, AlertCircle } from 'lucide-react';

export function DopamineCurve() {
  return (
    <div className="p-6 bg-card border border-border rounded-xl">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2 bg-purple-500/15 rounded-lg">
          <TrendingUp className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            Recruit Dopamine Curve
            <span className="text-xs font-medium text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full">
              INTERNAL — MANAGERS
            </span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Understanding the psychological progression across interviews
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Interview 1 */}
        <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-xs font-bold text-black">
              1
            </div>
            <span className="font-semibold text-yellow-400 text-sm">Easy Entry</span>
          </div>
          <ul className="text-sm text-foreground/70 space-y-1">
            <li>• Curiosity</li>
            <li>• Excitement</li>
            <li>• Low threat</li>
          </ul>
        </div>

        {/* Interview 2 */}
        <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white">
              2
            </div>
            <span className="font-semibold text-orange-400 text-sm">Investment</span>
          </div>
          <ul className="text-sm text-foreground/70 space-y-1">
            <li>• Sunk cost</li>
            <li>• Seriousness</li>
            <li>• Self-reflection</li>
          </ul>
        </div>

        {/* Interview 3 */}
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold text-white">
              3
            </div>
            <span className="font-semibold text-red-400 text-sm">Decision Point</span>
          </div>
          <ul className="text-sm text-foreground/70 space-y-1">
            <li>• Pressure</li>
            <li>• Clarity</li>
            <li>• Pride</li>
          </ul>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-amber-400 font-medium mb-1">Timing is everything</p>
          <div className="text-foreground/70 space-y-1">
            <p><strong className="text-foreground">If dopamine drops too early →</strong> candidate disengages</p>
            <p><strong className="text-foreground">If pressure comes too early →</strong> candidate folds</p>
          </div>
          <p className="text-muted-foreground mt-2 italic">
            This system sequences both correctly.
          </p>
        </div>
      </div>
    </div>
  );
}
