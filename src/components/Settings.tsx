import { useNavigate } from '@tanstack/react-router';

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div id="settings-screen" className="active">
      <div className="set-title">설정</div>

      <div className="set-section">
        <h3>조작키</h3>
        <div className="key-row">
          <span className="key-label">← → ↑</span>
          <span className="key-desc">이동 및 점프</span>
        </div>
        <div className="key-row">
          <span className="key-label">A D W</span>
          <span className="key-desc">이동 및 점프 (대체)</span>
        </div>
        <div className="key-row">
          <span className="key-label">Space</span>
          <span className="key-desc">점프</span>
        </div>
        <div className="key-row">
          <span className="key-label">E</span>
          <span className="key-desc">오브젝트 조사</span>
        </div>
      </div>

      <div className="set-section">
        <h3>프로그램 구성</h3>
        <p>
          이 게임은 서정주의 시 「국화 옆에서」를 네 개의
          스테이지로 나누어, 각 구절의 파편을 수집하며 시를 완성하는
          횡스크롤 탐험 게임입니다.
          <br />
          <br />
          각 스테이지는 시의 한 연에 대응하며, 흩어진 시어(詩語)를 모두
          모으면 다음 스테이지로 자동 전환됩니다.
          <br />
          <br />
          React + TypeScript + Vite + TanStack Router로 구성되어 있으며,
          모든 게임 그래픽은 HTML5 Canvas로 실시간 렌더링됩니다.
        </p>
      </div>

      <button className="back-btn" onClick={() => navigate({ to: '/' })}>
        ← 돌아가기
      </button>
    </div>
  );
}
