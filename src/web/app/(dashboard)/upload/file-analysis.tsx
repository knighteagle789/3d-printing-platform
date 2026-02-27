import { UploadedFile } from '@/lib/api/files';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface FileAnalysisProps {
  file: UploadedFile;
}

function AnalysisRow({ label, value }: { label: string; value: string | number | null }) {
  if (value == null) return null;
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </>
  );
}

export function FileAnalysisPanel({ file }: FileAnalysisProps) {
  const a = file.analysis;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">File Analysis</CardTitle>
          {a ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Analyzed
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Info className="h-3 w-3" />
              Pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!a ? (
          <p className="text-sm text-muted-foreground">
            Analysis will be available shortly after upload.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Dimensions */}
            {a.dimensionX && a.dimensionY && a.dimensionZ && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Dimensions
                </p>
                <p className="font-medium text-sm">
                  {a.dimensionX.toFixed(1)} × {a.dimensionY.toFixed(1)} × {a.dimensionZ.toFixed(1)} mm
                </p>
              </div>
            )}

            {/* Key stats grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <AnalysisRow
                label="Volume"
                value={a.volumeInCubicMm
                  ? `${a.volumeInCubicMm.toFixed(2)} mm³`
                  : null}
              />
              <AnalysisRow
                label="Est. weight"
                value={a.estimatedWeightGrams
                  ? `${a.estimatedWeightGrams.toFixed(1)} g`
                  : null}
              />
              <AnalysisRow
                label="Est. print time"
                value={a.estimatedPrintTimeHours
                  ? `${a.estimatedPrintTimeHours.toFixed(1)} hrs`
                  : null}
              />
              <AnalysisRow
                label="Triangles"
                value={a.triangleCount?.toLocaleString() ?? null}
              />
              <AnalysisRow
                label="Complexity"
                value={a.complexityScore != null ? `${a.complexityScore}/100` : null}
              />
            </div>

            {/* Flags */}
            <div className="flex flex-wrap gap-2 pt-1">
              {a.requiresSupport && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  Requires supports
                </Badge>
              )}
              {a.isManifold === true && (
                <Badge variant="secondary" className="text-xs">
                  Manifold ✓
                </Badge>
              )}
              {a.isManifold === false && (
                <Badge variant="destructive" className="text-xs">
                  Non-manifold
                </Badge>
              )}
            </div>

            {/* Warnings */}
            {a.warnings && (() => {
              try {
                const parsed: string[] = JSON.parse(a.warnings);
                return parsed.length > 0 ? (
                  <div className="space-y-1">
                    {parsed.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                        {w}
                      </p>
                    ))}
                  </div>
                ) : null;
              } catch {
                return (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
                    {a.warnings}
                  </p>
                );
              }
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}