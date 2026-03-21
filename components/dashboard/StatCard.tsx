import { AnimatePresence, motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: number | string;
  loading?: boolean;
}

const ease = [0.23, 1, 0.32, 1] as const;

export default function StatCard({ label, value, loading }: StatCardProps) {
  const displayed = typeof value === "number" ? value.toLocaleString() : String(value);

  return (
    <Card>
      <CardContent>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="relative mt-2 flex h-10 items-center overflow-hidden">
          {loading ? (
            <Skeleton className="h-9 w-24" />
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.p
                key={displayed}
                initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.3, ease }}
                className="text-4xl font-semibold tabular-nums"
              >
                {displayed}
              </motion.p>
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
