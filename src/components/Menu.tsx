import { useNavigate } from '@tanstack/react-router';

export default function Menu() {
  const navigate = useNavigate();

  return (
    <div id="menu-screen">
      <div className="menu-tag">POEM GAME</div>
      <div className="menu-title">
        국화 옆에서
      </div>
      <div className="menu-author">서정주 (徐廷柱)</div>
      <div className="menu-year">1947</div>
      <div className="menu-buttons">
        <button
          className="menu-btn"
          onClick={() => navigate({ to: '/game' })}
        >
          시작하기
        </button>
        <button
          className="menu-btn"
          onClick={() => navigate({ to: '/settings' })}
        >
          설정
        </button>
        <button
          className="menu-btn"
          onClick={() => navigate({ to: '/poem' })}
        >
          국화 옆에서란
        </button>
      </div>
    </div>
  );
}
