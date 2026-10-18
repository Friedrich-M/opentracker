import { Button, Icon, Tooltip, TooltipTrigger } from '@umami/react-zen';
import { useSpring, useTransform } from 'motion/react';
import { type ReactNode, useEffect } from 'react';
import { AnimatedDiv } from '@/components/common/AnimatedDiv';
import { Info } from '@/components/icons';
import { ChangeLabel } from '@/components/metrics/ChangeLabel';
import { formatNumber } from '@/lib/format';
import styles from './MetricsBar.module.css';

interface MetricCardProps {
  value: number;
  previousValue?: number;
  change?: number;
  label?: string;
  tooltip?: ReactNode;
  reverseColors?: boolean;
  formatValue?: (n: any) => string;
  showLabel?: boolean;
  showChange?: boolean;
}

export const MetricCard = ({
  value = 0,
  change = 0,
  label,
  tooltip,
  reverseColors = false,
  formatValue = formatNumber,
  showLabel = true,
  showChange = false,
}: MetricCardProps) => {
  const diff = value - change;
  const pct = diff !== 0 ? ((value - diff) / diff) * 100 : value !== 0 ? 100 : 0;
  const x = Number(value) || 0;
  const p = Number(pct) || 0;
  const xSpring = useSpring(0, { stiffness: 170, damping: 26 });
  const pctSpring = useSpring(0, { stiffness: 170, damping: 26 });
  const valueText = useTransform(xSpring, n => formatValue(n));
  const pctText = useTransform(pctSpring, n => `${Math.abs(~~n)}%`);

  useEffect(() => {
    xSpring.set(x);
  }, [x, xSpring]);

  useEffect(() => {
    pctSpring.set(p);
  }, [p, pctSpring]);

  return (
    <div className={styles.figure}>
      {/* The change sits beside the figure, so every caption is one label and
          the cells stay aligned however narrow they get. */}
      <div className={styles.headline}>
        <div className={styles.value}>
          <AnimatedDiv title={value?.toString()}>{valueText}</AnimatedDiv>
        </div>
        {showChange && (
          <ChangeLabel value={change} title={formatValue(change)} reverseColors={reverseColors}>
            <AnimatedDiv>{pctText}</AnimatedDiv>
          </ChangeLabel>
        )}
      </div>
      {(showLabel || tooltip) && (
        <div className={styles.caption}>
          {showLabel && <span>{label}</span>}
          {tooltip && (
            <TooltipTrigger delay={0}>
              <Button size="sm" variant="quiet" aria-label={label}>
                <Icon size="sm">
                  <Info />
                </Icon>
              </Button>
              <Tooltip placement="top">{tooltip}</Tooltip>
            </TooltipTrigger>
          )}
        </div>
      )}
    </div>
  );
};
