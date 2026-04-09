import { useEffect, useState } from 'react';

type SchemaItem = { min: number; max: number; step: number; label: string };
type FragmentSchema = { xMin: number; xMax: number; yOffsetMin: number; yOffsetMax: number };
type StageAPI = {
  tunables: Record<string, any>;
  schema: Record<string, SchemaItem>;
  fragmentSchema: FragmentSchema;
  setTunable: (key: string, value: number) => void;
  setFragment: (idx: number, x: number, yOffset: number) => void;
  restart: () => void;
};

interface AdminPanelProps {
  stage: number;
  onClose: () => void;
}

export default function AdminPanel({ stage, onClose }: AdminPanelProps) {
  const api = (window as any)['s' + stage + 'API'] as StageAPI | undefined;
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 200);
    return () => clearInterval(id);
  }, []);

  if (!api) {
    return (
      <div className="admin-overlay" onClick={onClose}>
        <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-header">
            <h2>관리자 모드 — Stage {stage}</h2>
            <button className="admin-close" onClick={onClose}>✕</button>
          </div>
          <p style={{ padding: '20px', color: 'rgba(180,200,235,0.7)' }}>
            이 스테이지의 API가 아직 등록되지 않았습니다.
          </p>
        </div>
      </div>
    );
  }

  const handleChange = (key: string, value: number) => {
    api.setTunable(key, value);
    force((x) => x + 1);
  };

  const handleFragmentChange = (idx: number, axis: 'x' | 'yOffset', value: number) => {
    const f = api.tunables.fragments[idx];
    const newX = axis === 'x' ? value : f.x;
    const newY = axis === 'yOffset' ? value : f.yOffset;
    api.setFragment(idx, newX, newY);
    force((x) => x + 1);
  };

  const copyHardcodedValues = () => {
    const lines: string[] = [`// === Stage ${stage} tunables (paste into stage${stage}.ts) ===`];
    Object.keys(api.schema).forEach((k) => {
      lines.push(`  ${k}: ${api.tunables[k]},`);
    });
    lines.push(`  fragments: [`);
    api.tunables.fragments.forEach((f: any, i: number) => {
      lines.push(`    { x: ${f.x}, yOffset: ${f.yOffset} }, // 다이아 ${i}`);
    });
    lines.push(`  ],`);
    const text = lines.join('\n');
    navigator.clipboard?.writeText(text);
    alert('현재 값을 클립보드에 복사했습니다.\n\n' + text);
  };

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-header">
          <h2>관리자 모드 — Stage {stage}</h2>
          <button className="admin-close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={() => api.restart()}>↻ 이 스테이지 다시 시작</button>
          <button className="admin-btn" onClick={copyHardcodedValues}>📋 현재 값 복사 (코드용)</button>
        </div>
        <div className="admin-section">
          <h3>물리 / 캐릭터 / 라벨</h3>
          {Object.entries(api.schema).map(([key, sch]) => (
            <div className="admin-row" key={key}>
              <label className="admin-label">{sch.label}</label>
              <input type="range" min={sch.min} max={sch.max} step={sch.step}
                value={api.tunables[key]}
                onChange={(e) => handleChange(key, parseFloat(e.target.value))}
                className="admin-slider" />
              <span className="admin-value">{api.tunables[key]}</span>
            </div>
          ))}
        </div>
        <div className="admin-section">
          <h3>다이아 위치</h3>
          {api.tunables.fragments.map((f: any, idx: number) => (
            <div className="admin-frag" key={idx}>
              <div className="admin-frag-title">다이아 {idx}</div>
              <div className="admin-row">
                <label className="admin-label">X</label>
                <input type="range" min={api.fragmentSchema.xMin} max={api.fragmentSchema.xMax} step={10}
                  value={f.x} onChange={(e) => handleFragmentChange(idx, 'x', parseFloat(e.target.value))}
                  className="admin-slider" />
                <span className="admin-value">{f.x}</span>
              </div>
              <div className="admin-row">
                <label className="admin-label">Y (groundY 기준)</label>
                <input type="range" min={api.fragmentSchema.yOffsetMin} max={api.fragmentSchema.yOffsetMax} step={1}
                  value={f.yOffset} onChange={(e) => handleFragmentChange(idx, 'yOffset', parseFloat(e.target.value))}
                  className="admin-slider" />
                <span className="admin-value">{f.yOffset}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="admin-hint">
          ※ 슬라이더로 조정한 값은 페이지 새로고침 시 사라집니다. <br />
          마음에 드는 값이 나오면 "현재 값 복사" 버튼을 눌러 코드의{' '}
          <code>tunables</code> 블록(<code>// @TUNABLE</code> 주석 표시 위치)에 붙여넣으세요.
        </p>
      </div>
    </div>
  );
}
