import { useNavigate } from '@tanstack/react-router';

export default function PoemInfo() {
  const navigate = useNavigate();

  return (
    <div id="poem-screen" className="active">
      <div className="poem-info-wrap">
        <div className="pi-title">국화 옆에서</div>
        <div className="pi-author">서정주 (徐廷柱, 1915–2000)</div>

        <div className="pi-poem">
          한 송이 국화꽃을 피우기 위해<br />
          봄부터 소쩍새는<br />
          그렇게 울었나 보다.<br />
          <br />
          한 송이 국화꽃을 피우기 위해<br />
          천둥은 먹구름 속에서<br />
          또 그렇게 울었나 보다.<br />
          <br />
          그립고 아쉬움에 가슴 조이던<br />
          머언 먼 젊음의 뒤안길에서<br />
          인제는 돌아와 거울 앞에 선<br />
          내 누님같이 생긴 꽃이여.<br />
          <br />
          노오란 네 꽃잎이 피려고<br />
          간밤에 무서리가 저리 내리고<br />
          내게는 잠도 오지 않았나 보다.
        </div>

        <div className="pi-desc">
          <p>
            서정주(호 미당)는 전라북도 고창 출신의 시인으로, 한국 현대시의
            거장입니다. 생명의 근원과 영원성을 탐구하는 시 세계로 한국 문학사에
            깊은 족적을 남겼습니다. 대표 시집으로 『화사집』(1941),
            『귀촉도』(1948), 『신라초』(1961) 등이 있습니다.
          </p>
          <p>
            「국화 옆에서」(1947)는 한 송이 국화꽃이 피기까지의 과정을 통해
            아름다움의 완성에는 오랜 고통과 인내가 필요함을 노래한 시입니다.
            봄의 소쩍새 울음, 여름의 천둥, 가을의 무서리를 거쳐야 비로소
            피어나는 국화는 시인 자신의 삶과 예술의 성숙 과정을 상징합니다.
          </p>
          <p>
            '내 누님같이 생긴 꽃'이라는 표현은 그리움과 친밀함이 어린 성숙의
            아름다움을 나타내며, 마지막 연에서 '잠도 오지 않았나 보다'라는
            고백은 꽃의 개화를 위해 시인 자신도 함께 고통받았음을 드러냅니다.
          </p>
        </div>

        <button className="back-btn" onClick={() => navigate({ to: '/' })}>
          ← 돌아가기
        </button>
      </div>
    </div>
  );
}
