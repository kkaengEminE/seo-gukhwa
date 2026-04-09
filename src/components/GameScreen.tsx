import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { initStage1 } from '../stages/stage1';
import { initStage2 } from '../stages/stage2';
import { initStage3 } from '../stages/stage3';
import { initStage4 } from '../stages/stage4';
import AdminPanel from './AdminPanel';

const ADMIN_ENABLED = true;

const STAGE_NAMES: Record<number, string> = {
  1: '봄, 소쩍새',
  2: '천둥과 먹구름',
  3: '거울 앞에 선 꽃',
  4: '노오란 꽃잎',
};

declare global {
  interface Window {
    gameStartS1?: () => void;
    gameStartS2?: () => void;
    gameStartS3?: () => void;
    gameStartS4?: () => void;
    initStage1?: () => void;
    initStage2?: () => void;
    initStage3?: () => void;
    initStage4?: () => void;
    onStageClear?: (stageNum: number) => void;
    onGameComplete?: () => void;
  }
}

export default function GameScreen() {
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(1);
  const [interludeVisible, setInterludeVisible] = useState(false);
  const [transitionBlack, setTransitionBlack] = useState(true);
  const [adminOpen, setAdminOpen] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    initStage1();
    initStage2();
    initStage3();
    initStage4();

    window.onStageClear = (stageNum: number) => {
      if (stageNum < 4) {
        advanceToStage(stageNum + 1);
      }
    };

    window.onGameComplete = () => {};

    activateStage(1);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate({ to: '/' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function activateStage(n: number) {
    setCurrentStage(n);
    document.querySelectorAll<HTMLDivElement>('.sw').forEach((el) => {
      el.classList.remove('active');
    });
    const sw = document.getElementById('sw' + n);
    if (sw) {
      sw.classList.add('active');
      const ts = sw.querySelector<HTMLDivElement>('[id$="title_screen"]');
      if (ts) ts.style.display = 'none';
    }
    setInterludeVisible(true);
    setTimeout(() => {
      setTransitionBlack(false);
      setTimeout(() => setInterludeVisible(false), 1800);
    }, 400);
    setTimeout(() => {
      const startFn = (window as any)['gameStartS' + n];
      if (typeof startFn === 'function') startFn();
    }, 2300);
  }

  function advanceToStage(n: number) {
    setTransitionBlack(true);
    setTimeout(() => { activateStage(n); }, 1200);
  }

  return (
    <>
      <div id="screen-transition" className={transitionBlack ? 'black' : ''} />
      <div id="stage-interlude" className={interludeVisible ? 'show' : ''}>
        <div className="si-label">Stage 0{currentStage}</div>
        <div className="si-title">{STAGE_NAMES[currentStage]}</div>
      </div>

      <button id="stage-restart-btn" onClick={() => {
        const fn = (window as any)['gameStartS' + currentStage];
        if (typeof fn === 'function') fn();
      }}>↻ 스테이지 다시 시작</button>
      {ADMIN_ENABLED && (
        <button id="admin-toggle" onClick={() => setAdminOpen(true)}>⚙ 관리자 모드</button>
      )}
      {adminOpen && (
        <AdminPanel stage={currentStage} onClose={() => setAdminOpen(false)} />
      )}

      {/* ═══ STAGE 1 — 봄, 소쩍새 ═══ */}
      <div className="sw" id="sw1">
        <svg id="s1cursor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="4" fill="rgba(140,200,120,0.8)" />
          <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(120,180,100,0.3)" strokeWidth="0.5" />
        </svg>
        <canvas id="s1game_canvas" />
        <div id="s1hud">
          <div id="s1poem_strip">
            <div className="poem-line" id="s1l0">한 송이 국화꽃을 피우기 위해</div>
            <div className="poem-line" id="s1l1">봄부터 소쩍새는</div>
            <div className="poem-line" id="s1l2">그렇게 울었나 보다.</div>
          </div>
          <div id="s1stage_label">Stage 1 · 봄, 소쩍새</div>
          <div id="s1fragment_hud">
            <div className="frag-dot" id="s1d0" />
            <div className="frag-dot" id="s1d1" />
            <div className="frag-dot" id="s1d2" />
          </div>
          <div id="controls-hint">방향키 / WASD · 이동<br />마우스 · 탐색</div>
          <div id="word-popup" />
        </div>
        <div id="s1stage_clear">
          <div className="clear-poem">한 송이 국화꽃을 피우기 위해<br />봄부터 소쩍새는<br />그렇게 울었나 보다.</div>
          <div className="poet-note">— 서정주, 1947</div>
        </div>
      </div>

      {/* ═══ STAGE 2 — 천둥과 먹구름 ═══ */}
      <div className="sw" id="sw2">
        <svg id="s2cursor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="3" fill="rgba(180,180,210,0.8)" />
          <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(150,150,190,0.3)" strokeWidth="0.5" />
        </svg>
        <canvas id="s2game_canvas" />
        <div id="s2hud">
          <div id="s2poem_strip">
            <div className="poem-line" id="s2l0">한 송이 국화꽃을 피우기 위해</div>
            <div className="poem-line" id="s2l1">천둥은 먹구름 속에서</div>
            <div className="poem-line" id="s2l2">또 그렇게 울었나 보다.</div>
          </div>
          <div id="s2stage_label">Stage 2 · 천둥과 먹구름</div>
          <div id="s2fragment_hud">
            <div className="frag-dot" id="s2d0" />
            <div className="frag-dot" id="s2d1" />
            <div className="frag-dot" id="s2d2" />
          </div>
          <div id="s2ctrl">방향키 이동 · ↑ 점프</div>
          <div id="s2word_flash" />
        </div>
        <div id="s2stage_clear">
          <div className="clear-poem">한 송이 국화꽃을 피우기 위해<br />천둥은 먹구름 속에서<br />또 그렇게 울었나 보다.</div>
          <div className="poet-note">— 서정주, 1947</div>
        </div>
      </div>

      {/* ═══ STAGE 3 — 거울 앞에 선 꽃 ═══ */}
      <div className="sw" id="sw3">
        <svg id="s3cursor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="3" fill="rgba(220,180,100,0.85)" />
          <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(200,160,80,0.3)" strokeWidth="0.5" />
        </svg>
        <canvas id="s3game_canvas" />
        <div id="s3hud">
          <div id="s3poem_strip">
            <div className="poem-line" id="s3l0">그립고 아쉬움에 가슴 조이던</div>
            <div className="poem-line" id="s3l1">머언 먼 젊음의 뒤안길에서</div>
            <div className="poem-line" id="s3l2">인제는 돌아와 거울 앞에 선</div>
            <div className="poem-line" id="s3l3">내 누님같이 생긴 꽃이여.</div>
          </div>
          <div id="s3stage_label">Stage 3 · 거울 앞에 선 꽃</div>
          <div id="s3fragment_hud">
            <div className="frag-dot" id="s3d0" />
            <div className="frag-dot" id="s3d1" />
            <div className="frag-dot" id="s3d2" />
            <div className="frag-dot" id="s3d3" />
          </div>
          <div id="s3ctrl">방향키 이동 · ↑ 점프<br />E · 오브젝트 조사</div>
          <div id="s3word_flash" />
          <div id="s3thought" />
        </div>
        <div id="s3stage_clear">
          <div className="clear-poem">그립고 아쉬움에 가슴 조이던<br />머언 먼 젊음의 뒤안길에서<br />인제는 돌아와 거울 앞에 선<br />내 누님같이 생긴 꽃이여.</div>
          <div className="poet-note">— 서정주, 1947</div>
        </div>
      </div>

      {/* ═══ STAGE 4 — 노오란 꽃잎 ═══ */}
      <div className="sw" id="sw4">
        <svg id="s4cursor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
          <circle cx="9" cy="9" r="3" fill="rgba(240,210,80,0.85)" />
          <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(220,190,60,0.3)" strokeWidth="0.5" />
        </svg>
        <canvas id="s4game_canvas" />
        <div id="s4hud">
          <div id="s4poem_strip">
            <div className="poem-line" id="s4l0">노오란 네 꽃잎이 피려고</div>
            <div className="poem-line" id="s4l1">간밤에 무서리가 저리 내리고</div>
            <div className="poem-line" id="s4l2">내게는 잠도 오지 않았나 보다.</div>
          </div>
          <div id="s4stage_label">Stage 4 · 노오란 꽃잎</div>
          <div id="s4fragment_hud">
            <div className="frag-dot" id="s4d0" />
            <div className="frag-dot" id="s4d1" />
            <div className="frag-dot" id="s4d2" />
          </div>
          <div id="s4ctrl">방향키 이동 · ↑ 점프</div>
          <div id="s4word_flash" />
        </div>
        <div id="s4ending_screen">
          <div id="s4ending_poem">
            한 송이 국화꽃을 피우기 위해<br />
            봄부터 소쩍새는<br />
            그렇게 울었나 보다.<br /><br />
            한 송이 국화꽃을 피우기 위해<br />
            천둥은 먹구름 속에서<br />
            또 그렇게 울었나 보다.<br /><br />
            그립고 아쉬움에 가슴 조이던<br />
            머언 먼 젊음의 뒤안길에서<br />
            인제는 돌아와 거울 앞에 선<br />
            내 누님같이 생긴 꽃이여.<br /><br />
            노오란 네 꽃잎이 피려고<br />
            간밤에 무서리가 저리 내리고<br />
            내게는 잠도 오지 않았나 보다.
          </div>
          <div id="s4ending_poet">— 서정주 (徐廷柱), 1947</div>
          <div id="s4ending_author_note">
            서정주(1915–2000)는 전라북도 고창 출신의 시인입니다.<br />
            호는 미당(未堂). 생명의 근원과 영원성을 탐구하는 시 세계로<br />
            한국 현대시의 거장으로 평가받습니다.<br />
            이 시는 아름다움의 완성에는 오랜 고통과 인내가<br />
            필요함을 국화꽃의 개화를 통해 노래합니다.
          </div>
          <button id="s4restart_btn" onClick={() => location.reload()}>처음부터 다시</button>
        </div>
      </div>
    </>
  );
}
