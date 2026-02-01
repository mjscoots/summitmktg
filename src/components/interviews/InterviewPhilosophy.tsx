import { Brain, AlertTriangle } from 'lucide-react';

export function InterviewPhilosophy() {
  return (
    <div className="mb-8 p-5 bg-blue-500/5 border border-blue-500/20 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-500/15 rounded-lg">
          <Brain className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
            Interview Philosophy
            <span className="text-xs font-medium text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
              MANAGER CONTEXT
            </span>
          </h3>
          <div className="space-y-3 text-sm text-foreground/80">
            <p>
              <strong className="text-foreground">Interviewing at Summit is not about convincing people.</strong>
            </p>
            <p>
              It's about identifying <span className="text-blue-400 font-medium">decisiveness</span>, 
              <span className="text-blue-400 font-medium"> commitment</span>, and 
              <span className="text-blue-400 font-medium"> effort tolerance</span>.
            </p>
            <div className="flex items-start gap-2 pt-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-yellow-400 font-medium">Weak candidates disqualify themselves.</p>
                <p className="text-muted-foreground">Strong candidates lean in harder under structure and pressure.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
