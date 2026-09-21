"use client";

import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItemContent,
  SelectTriggerGroup,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type PreferenceSelect = {
  id: string;
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string }[];
};

type PreferenceSwitch = {
  id: string;
  label: string;
  description?: string;
  value: boolean;
};

const initialSelects: PreferenceSelect[] = [
  {
    description: "대시보드를 열 때 표시할 첫 화면을 선택합니다.",
    id: "homeView",
    label: "기본 시작 화면",
    options: [
      { label: "경영 현황", value: "overview" },
      { label: "재무 실적", value: "financials" },
      { label: "결제 운영", value: "billing" },
      { label: "고객 상태", value: "customers" },
      { label: "알림 및 이상 징후", value: "alerts" },
    ],
    value: "overview",
  },
  {
    description: "차트와 표에 기본으로 적용합니다.",
    id: "dateRange",
    label: "기본 조회 기간",
    options: [
      { label: "최근 7일", value: "7d" },
      { label: "최근 30일", value: "30d" },
      { label: "최근 90일", value: "90d" },
      { label: "이번 달 누적", value: "mtd" },
      { label: "이번 분기 누적", value: "qtd" },
    ],
    value: "30d",
  },
  {
    description: "대시보드 금액은 원화로 표시합니다.",
    id: "currency",
    label: "통화",
    options: [{ label: "₩ 대한민국 원", value: "krw" }],
    value: "krw",
  },
  {
    description: "핵심 지표의 큰 숫자 표시 형식입니다.",
    id: "numberFormat",
    label: "숫자 형식",
    options: [
      { label: "축약 (12.8만)", value: "compact" },
      { label: "일반 (128,430)", value: "standard" },
      { label: "회계 (128,430.00)", value: "accounting" },
    ],
    value: "compact",
  },
  {
    description: "표와 카드의 간격을 설정합니다.",
    id: "density",
    label: "정보 밀도",
    options: [
      { label: "여유롭게", value: "comfortable" },
      { label: "간결하게", value: "compact" },
      { label: "촘촘하게", value: "dense" },
    ],
    value: "comfortable",
  },
];

const initialSwitches: PreferenceSwitch[] = [
  {
    description: "대시보드의 애니메이션을 최소화합니다.",
    id: "reducedMotion",
    label: "애니메이션 줄이기",
    value: false,
  },
  {
    description: "핵심 지표 카드에 작은 추이 차트를 표시합니다.",
    id: "showKpiSparks",
    label: "핵심 지표 추이 표시",
    value: true,
  },
  {
    description: "데이터가 바뀌면 핵심 지표를 자동 갱신합니다.",
    id: "liveUpdates",
    label: "실시간 갱신",
    value: true,
  },
  {
    description: "차트의 급등·급락과 이상값을 강조합니다.",
    id: "anomalyDetection",
    label: "이상 징후 강조",
    value: true,
  },
  {
    description: "메모의 :) 같은 문자를 🙂 이모지로 변환합니다.",
    id: "convertEmoticons",
    label: "문자 이모티콘 변환",
    value: false,
  },
];

function PreferenceRow({
  label,
  description,
  control,
  htmlFor,
}: {
  label: string;
  description?: string;
  control: React.ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 space-y-1">
        <Label
          className="text-sm font-medium text-foreground"
          htmlFor={htmlFor}
        >
          {label}
        </Label>
        {description ? (
          <p className="text-sm text-muted-foreground leading-snug">
            {description}
          </p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function PreferencesDialogContent() {
  const [selects, setSelects] = React.useState(initialSelects);
  const [switches, setSwitches] = React.useState(initialSwitches);

  function setSelectValue(id: string, value: string) {
    setSelects((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  }

  function setSwitchValue(id: string, value: boolean) {
    setSwitches((prev) => prev.map((s) => (s.id === id ? { ...s, value } : s)));
  }

  const selectById = React.useMemo(
    () => Object.fromEntries(selects.map((s) => [s.id, s])),
    [selects],
  );
  const switchById = React.useMemo(
    () => Object.fromEntries(switches.map((s) => [s.id, s])),
    [switches],
  );

  return (
    <ScrollArea className="max-h-[70vh] w-full" gradientScrollFade noScrollBar>
      <div className="space-y-4">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">일반</CardTitle>
            <CardDescription>기본 동작과 표시 형식입니다.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <PreferenceRow
              control={
                <Select
                  items={selectById.homeView.options}
                  onValueChange={(v) => setSelectValue("homeView", v as string)}
                  value={selectById.homeView.value}
                >
                  <SelectTriggerGroup className="w-[180px] sm:w-[220px] bg-muted/40" />
                  <SelectContent alignItemWithTrigger>
                    {selectById.homeView.options.map((o) => (
                      <SelectItemContent key={o.value} value={o.value}>
                        {o.label}
                      </SelectItemContent>
                    ))}
                  </SelectContent>
                </Select>
              }
              description={selectById.homeView.description}
              label={selectById.homeView.label}
            />

            <PreferenceRow
              control={
                <Select
                  items={selectById.dateRange.options}
                  onValueChange={(v) =>
                    setSelectValue("dateRange", v as string)
                  }
                  value={selectById.dateRange.value}
                >
                  <SelectTriggerGroup className="w-[180px] sm:w-[220px] bg-muted/40" />

                  <SelectContent alignItemWithTrigger>
                    {selectById.dateRange.options.map((o) => (
                      <SelectItemContent key={o.value} value={o.value}>
                        {o.label}
                      </SelectItemContent>
                    ))}
                  </SelectContent>
                </Select>
              }
              description={selectById.dateRange.description}
              label={selectById.dateRange.label}
            />

            <PreferenceRow
              control={
                <Select
                  items={selectById.currency.options}
                  onValueChange={(v) => setSelectValue("currency", v as string)}
                  value={selectById.currency.value}
                >
                  <SelectTriggerGroup className="w-[180px] sm:w-[220px] bg-muted/40" />
                  <SelectContent>
                    {selectById.currency.options.map((o) => (
                      <SelectItemContent key={o.value} value={o.value}>
                        {o.label}
                      </SelectItemContent>
                    ))}
                  </SelectContent>
                </Select>
              }
              description={selectById.currency.description}
              label={selectById.currency.label}
            />

            <PreferenceRow
              control={
                <Select
                  items={selectById.numberFormat.options}
                  onValueChange={(v) =>
                    setSelectValue("numberFormat", v as string)
                  }
                  value={selectById.numberFormat.value}
                >
                  <SelectTriggerGroup className="w-[180px] sm:w-[220px] bg-muted/40" />
                  <SelectContent alignItemWithTrigger>
                    {selectById.numberFormat.options.map((o) => (
                      <SelectItemContent key={o.value} value={o.value}>
                        {o.label}
                      </SelectItemContent>
                    ))}
                  </SelectContent>
                </Select>
              }
              description={selectById.numberFormat.description}
              label={selectById.numberFormat.label}
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">화면 및 테마</CardTitle>
            <CardDescription>
              화면 밀도와 조작 방식을 설정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <PreferenceRow
              control={
                <Select
                  items={selectById.density.options}
                  onValueChange={(v) => setSelectValue("density", v as string)}
                  value={selectById.density.value}
                >
                  <SelectTriggerGroup className="w-[180px] sm:w-[220px] bg-muted/40" />
                  <SelectContent alignItemWithTrigger>
                    {selectById.density.options.map((o) => (
                      <SelectItemContent key={o.value} value={o.value}>
                        {o.label}
                      </SelectItemContent>
                    ))}
                  </SelectContent>
                </Select>
              }
              description={selectById.density.description}
              label={selectById.density.label}
            />

            <PreferenceRow
              control={
                <Switch
                  checked={switchById.reducedMotion.value}
                  id="reducedMotion"
                  onCheckedChange={(v) => setSwitchValue("reducedMotion", v)}
                />
              }
              description={switchById.reducedMotion.description}
              htmlFor="reducedMotion"
              label={switchById.reducedMotion.label}
            />

            <PreferenceRow
              control={
                <Switch
                  checked={switchById.showKpiSparks.value}
                  id="showKpiSparks"
                  onCheckedChange={(v) => setSwitchValue("showKpiSparks", v)}
                />
              }
              description={switchById.showKpiSparks.description}
              htmlFor="showKpiSparks"
              label={switchById.showKpiSparks.label}
            />

            <PreferenceRow
              control={
                <Switch
                  checked={switchById.liveUpdates.value}
                  id="liveUpdates"
                  onCheckedChange={(v) => setSwitchValue("liveUpdates", v)}
                />
              }
              description={switchById.liveUpdates.description}
              htmlFor="liveUpdates"
              label={switchById.liveUpdates.label}
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">분석 설정</CardTitle>
            <CardDescription>이상 징후와 자동화 설정입니다.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <PreferenceRow
              control={
                <Switch
                  checked={switchById.anomalyDetection.value}
                  id="anomalyDetection"
                  onCheckedChange={(v) => setSwitchValue("anomalyDetection", v)}
                />
              }
              description={switchById.anomalyDetection.description}
              htmlFor="anomalyDetection"
              label={switchById.anomalyDetection.label}
            />

            <PreferenceRow
              control={
                <Switch
                  checked={switchById.convertEmoticons.value}
                  id="convertEmoticons"
                  onCheckedChange={(v) => setSwitchValue("convertEmoticons", v)}
                />
              }
              description={switchById.convertEmoticons.description}
              htmlFor="convertEmoticons"
              label={switchById.convertEmoticons.label}
            />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
