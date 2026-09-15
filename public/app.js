const toggle=document.querySelector('.menu-toggle');const nav=document.querySelector('#nav');toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');nav.classList.toggle('open',open)});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','메뉴 열기');nav.classList.remove('open')}));
const programs=[['개인 상담','반복되는 걱정, 지친 마음, 관계에서의 어려움처럼 일상 속 고민을 이야기하는 시간입니다. 지금 느끼는 감정과 생각을 살펴보고, 상담에서 다루고 싶은 주제를 함께 정합니다.','이런 이야기를 나눌 수 있어요','나를 이해하고 싶은 마음 · 반복되는 스트레스 · 관계에서 느끼는 어려움'],['부부 · 가족 상담','가까운 관계 안에서 서로 다른 기대와 표현 방식을 돌아보는 시간입니다. 누구의 잘못인지 결론을 내리기보다 각자가 경험하는 어려움을 이야기하고 함께 바라는 변화를 살펴봅니다.','문의 전에 확인해 주세요','상담에 참여할 구성원과 함께 다루고 싶은 주제를 확인해 보세요.'],['트라우마 상담','트라우마를 겪은 분들을 위한 전문 상담입니다. 안전하고 편안한 환경에서 각자의 경험과 필요에 맞춰 정서적 안정과 회복을 위한 상담을 진행합니다. 상담에서 이야기할 범위와 진행 방향은 함께 논의할 수 있습니다.','내가 준비된 만큼','세부 경험을 온라인 문의에 적을 필요는 없습니다. 첫 만남에서 이야기할 범위와 상담의 방향을 논의해 보세요.'],['청소년 상담','학교생활과 친구 관계, 진로와 가족 안에서 느끼는 마음을 이야기하는 시간입니다. 청소년이 상담에서 기대하는 점을 확인하고 자신을 표현할 수 있는 방향을 살펴봅니다.','문의 전에 확인해 주세요','상담 대상 연령, 보호자 참여 여부와 동의 절차는 센터에 확인해 주세요.']];
programs.push(['아동 · 놀이 상담','연구소에서는 놀이상담을 비롯해 아동의 마음을 살피는 상담을 진행합니다. 아이가 표현하는 감정과 경험에 귀 기울이며, 아이의 눈높이에 맞는 만남을 준비합니다.','문의 전에 확인해 주세요','상담 대상 연령 · 보호자 참여와 동의 절차 · 아이의 고민과 상담에서 바라는 점'],['집단 프로그램','연구소의 활동 기록에는 협동 미술을 통해 감정을 표현하고 서로의 작품을 존중하는 시간이 소개되어 있습니다. 함께 만드는 과정에서 협력과 소통을 경험하는 프로그램입니다.','참여를 원하신다면','소개된 활동은 지난 프로그램 기록입니다. 현재 모집 여부, 대상 연령, 일정과 참여 비용은 전화로 문의해 주세요.']);
const dialog=document.querySelector('#detail');let inquiry=false;let previous;
function show(title,copy,heading,extra){previous=document.activeElement;document.querySelector('#dialog-title').textContent=title;document.querySelector('#dialog-copy').textContent=copy;const box=document.querySelector('#dialog-extra');box.replaceChildren();const strong=document.createElement('strong');strong.textContent=heading;box.append(strong,document.createElement('br'),document.createTextNode(extra));dialog.showModal();document.body.style.overflow='hidden'}
document.querySelectorAll('[data-program]').forEach(b=>b.addEventListener('click',()=>{inquiry=false;document.querySelector('#dialog-action').innerHTML='첫 상담 과정 보기 <span>↗</span>';show(...programs[Number(b.dataset.program)])}));document.querySelector('#inquiry').addEventListener('click',()=>{inquiry=true;document.querySelector('#dialog-action').textContent='안내 확인';show('문의 전 확인사항','010-2340-7220으로 전화해 희망 상담 분야와 가능한 일정을 문의해 주세요. 온라인 신청은 접수 단계이며, 관리자의 일정 확인 후 예약이 확정됩니다.','방문 전에 확인해 주세요','상담 방식과 비용 · 예약 변경 및 취소 기준 · 킹덤오피스텔 층과 호수 · 주차 안내')});function close(){dialog.close()}document.querySelector('.close').addEventListener('click',close);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});dialog.addEventListener('close',()=>{document.body.style.overflow='';previous?.focus()});document.querySelector('#dialog-action').addEventListener('click',()=>{close();if(!inquiry)document.querySelector('#process').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});

const addressText='대구광역시 수성구 동대구로 386 킹덤오피스텔';document.querySelector('#copy-address').addEventListener('click',async()=>{const status=document.querySelector('#copy-status');try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(addressText);status.textContent='주소를 복사했습니다.';}catch{status.textContent='자동 복사를 사용할 수 없습니다. 위 주소를 길게 누르거나 선택해 복사해 주세요.';}});

// Native details preserve keyboard and touch access; hover is an enhancement.
const hoverProfiles = matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.counselor-card').forEach(card => {
  let pinned = false;
  const summary = card.querySelector('summary');
  summary.addEventListener('click', event => {
    event.preventDefault();
    pinned = !pinned;
    card.open = pinned;
  });
  card.addEventListener('mouseenter', () => {
    if (hoverProfiles.matches) card.open = true;
  });
  card.addEventListener('mouseleave', () => {
    if (hoverProfiles.matches && !pinned && !card.contains(document.activeElement)) card.open = false;
  });
  card.addEventListener('focusin', () => { card.open = true; });
  card.addEventListener('focusout', event => {
    if (!pinned && !card.contains(event.relatedTarget)) card.open = false;
  });
  card.addEventListener('keydown', event => {
    if (event.key === 'Escape') { pinned = false; card.open = false; }
  });
});
