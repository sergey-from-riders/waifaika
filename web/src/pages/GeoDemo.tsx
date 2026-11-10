import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Flag, LocateFixed, Navigation, Play, RotateCcw, WifiOff } from "lucide-react";
import { distanceBetweenMeters, formatDistance, bearingDegrees } from "@/lib/utils";
import "./geo-demo.css";

const target = {x:820,y:150};
function coordinate(point: {x:number;y:number}) {
  return {lat:43.595-point.y/550*0.025,lng:39.720+point.x/1000*0.035};
}
export default function GeoDemo() {
  const [started,setStarted] = useState<number|null>(null);
  const [seconds,setSeconds] = useState(0);
  useEffect(() => { document.title="Гольф-клуб: положение и расстояние — Riders Geo"; },[]);
  useEffect(() => {
    if(started===null)return;
    const timer=window.setInterval(() => {
      const elapsed = Math.min(24, (performance.now()-started)/1000);
      setSeconds(elapsed);
      if (elapsed === 24) window.clearInterval(timer);
    },80);
    return ()=>window.clearInterval(timer);
  },[started]);
  const progress=Math.max(0,Math.min(1,(seconds-9)/12));
  const person={x:130+progress*420,y:405-progress*145};
  const point=coordinate(person), destination=coordinate(target);
  const located=seconds>=3,selected=seconds>=7,offline=seconds>=19;
  const distance=distanceBetweenMeters(point,destination);
  const phase=started===null?0:!located?1:!selected?2:seconds<19?3:4;
  const titles=["Как найти объект на территории","Определяем положение посетителя","Положение найдено","Выбран клубный дом", "Карта остаётся с вами без сети"];
  const descriptions=["Посетитель → объект → расстояние. Посмотрите короткую демонстрацию.","Приложение получает координаты устройства.","Маркер «Вы здесь» появляется на карте клуба.","Расстояние пересчитывается, когда посетитель перемещается.","Заранее сохранённый план и объекты остаются доступны."];
  function play(){setSeconds(0);setStarted(performance.now());}
  return <div className="geo-demo">
    <header className="demo-header"><a href="/tech"><ArrowLeft size={17}/> RIDERS / geo</a><span>ГОЛЬФ-КЛУБ · ДЕМОНСТРАЦИЯ</span><a href="/">Wi-Fi-карта <ArrowUpRight size={16}/></a></header>
    <main>
      <div className="demo-heading"><div><p>КООРДИНАТЫ → ОБЪЕКТ → РАССТОЯНИЕ</p><h1>{titles[phase]}</h1><span>{descriptions[phase]}</span></div><button onClick={play}>{started?<RotateCcw size={18}/>:<Play size={18}/>} {started?"Повторить":"Смотреть демонстрацию"}</button></div>
      <div className="demo-stage">
        <div className="demo-map" aria-label="Демонстрационный план гольф-клуба с положением посетителя и клубным домом">
          <svg viewBox="0 0 1000 550" role="img" aria-label="План территории гольф-клуба">
            <defs><pattern id="demo-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#d3dfcb" strokeWidth="0.5"/></pattern><filter id="pin-shadow"><feDropShadow dx="0" dy="5" stdDeviation="8" floodOpacity="0.12"/></filter></defs>
            <rect width="1000" height="550" fill="#e6edde"/><rect width="1000" height="550" fill="url(#demo-grid)"/>
            <path d="M0 100 Q140 30 205 85T400 45 Q490 0 530 0H0Z" fill="#c0d5ad"/>
            <path d="M20 495 Q135 380 260 470T550 500 Q650 460 700 550H0Z" fill="#c6d9b7"/>
            <path d="M590 550 Q540 450 625 390 Q690 360 710 300 Q745 240 790 290 Q865 335 800 410 Q765 445 825 550Z" fill="#b7d8df" stroke="#a4c9d2" strokeWidth="2"/>
            <path d="M210 280 Q300 180 450 200 Q520 210 465 270 L300 340 Q240 360 210 280Z" fill="#bdd49f" stroke="#a5c28a" strokeWidth="2"/>
            <path d="M440 90 Q580 10 695 80 Q745 130 630 165L500 170 Q445 155 440 90Z" fill="#bfd5a1" stroke="#a5c28a" strokeWidth="2"/>
            <path d="M330 390 Q440 320 530 350 Q605 380 525 425L420 455 Q345 465 330 390Z" fill="#bdd49f" stroke="#a5c28a" strokeWidth="2"/>
            <ellipse cx="255" cy="287" rx="24" ry="16" fill="#ede5bd"/><ellipse cx="641" cy="114" rx="30" ry="17" fill="#ede5bd"/><ellipse cx="463" cy="405" rx="32" ry="15" fill="#ede5bd"/>
            <path d="M80 550 L115 415 Q120 360 205 380 L480 305 Q550 290 555 230 Q565 180 720 200 L850 200 L970 80" fill="none" stroke="#cdd0bf" strokeWidth="18"/><path d="M80 550 L115 415 Q120 360 205 380 L480 305 Q550 290 555 230 Q565 180 720 200 L850 200 L970 80" fill="none" stroke="#fffdf2" strokeWidth="13"/>
            <g fill="#91b078" opacity=".6">{[[65,160],[90,190],[150,130],[175,100],[895,310],[940,335],[905,380],[50,310],[80,340],[580,440],[580,480]].map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r="15"/>)}</g>
            <rect x="759" y="91" width="120" height="72" rx="8" fill="#d0c2a7" stroke="#ab9b7e" strokeWidth="2"/><path d="M749 130L819 75L889 130" fill="#667557"/>
            <rect x="105" y="446" width="120" height="55" rx="7" fill="#d2dac9"/>
            <g fontFamily="Arial,sans-serif" fontSize="12" fill="#52664a" letterSpacing="2"><text x="55" y="55">УСЛОВНЫЙ ПЛАН ТЕРРИТОРИИ</text><text x="272" y="260">ПОЛЕ № 1</text><text x="505" y="110">ПОЛЕ № 2</text><text x="368" y="390">ТРЕНИРОВОЧНАЯ ЗОНА</text><text x="127" y="480">ПАРКОВКА</text></g>
            {selected&&<line x1={person.x} y1={person.y} x2={target.x} y2={target.y} stroke="#365c4d" strokeWidth="2.5" strokeDasharray="7 7"/>}
            {selected&&<g transform={`translate(${(person.x+target.x)/2},${(person.y+target.y)/2})`} filter="url(#pin-shadow)"><rect x="-58" y="-20" width="116" height="40" rx="20" fill="#173e33"/><text textAnchor="middle" y="6" fill="white" fontSize="18" fontWeight="600">{formatDistance(distance)}</text></g>}
            <g transform="translate(820 150)" filter="url(#pin-shadow)"><circle r={selected?30:25} fill={selected?'#173e33':'#607c51'}/><path d="M-7 13V-13L12-8L-7-2" fill="none" stroke="#d0f199" strokeWidth="2.5"/><rect x="-77" y="39" width="154" height="30" rx="8" fill="white"/><text textAnchor="middle" y="59" fill="#294637" fontSize="13" fontWeight="600">Клубный дом</text></g>
            {located&&<g transform={`translate(${person.x} ${person.y})`}><circle r="36" fill="#477fc6" opacity=".12"/><circle r="18" fill="#477fc6" opacity=".18"/><circle r="9" fill="#3777bd" stroke="white" strokeWidth="4"/><rect x="-43" y="24" width="86" height="28" rx="8" fill="white"/><text textAnchor="middle" y="43" fill="#244467" fontSize="12" fontWeight="600">Вы здесь</text></g>}
            <g transform="translate(920 460)" fill="#466044"><path d="M0 35V0L-6 12M0 0L6 12" fill="none" stroke="currentColor" strokeWidth="2"/><text x="-5" y="-10" fontSize="13">N</text></g>
            <g transform="translate(45 512)" fill="#466044"><path d="M0 0V6H177V0" stroke="#466044" fill="none"/><text y="25" fontSize="12">500 м</text></g>
          </svg>
          <span className={`demo-network ${offline?'is-offline':''}`}>{offline?<WifiOff size={14}/>:<LocateFixed size={14}/>} {offline?'Без сети · план сохранён':located?'Положение определено':'Демонстрационный режим'}</span>

        </div>
        <aside className="demo-object">
          <div className="demo-object-top"><Flag size={20}/><span>ОБЪЕКТ НА КАРТЕ</span></div>
          <h2>Клубный дом</h2><p>Ресепшен, прокат инвентаря<br/>и ресторан гольф-клуба</p>
          <div className={`demo-distance ${selected?'is-active':''}`}><span>До объекта</span><strong data-testid="demo-distance">{selected?formatDistance(distance):'—'}</strong><small>по прямой от вашего положения</small></div>
          <div className="demo-bearing"><Navigation size={30} style={{transform:`rotate(${bearingDegrees(point,destination)-45}deg)`}}/><span>{selected?'Объект к северо-востоку':'Сначала определим положение'}</span></div>
          <div className="demo-coordinates"><span>Координаты посетителя</span><code>{located?`${point.lat.toFixed(5)}° N\n${point.lng.toFixed(5)}° E`:'Ожидаем начало демонстрации'}</code></div>
          <div className="demo-caption"><span>{offline?'04':selected?'03':located?'02':'01'}</span><p>{['Запустите демонстрацию','Определяем положение','Находим посетителя на карте','Выбираем объект и считаем расстояние','Продолжаем без интернета'][phase]}</p></div>
        </aside>
      </div>
      <div className="demo-timeline"><div style={{width:`${seconds/24*100}%`}}/></div>
      <footer><p>Демонстрационные координаты и условный гольф-клуб. Расстояние вычисляется по координатам; пунктир показывает направление по прямой, а не готовый маршрут.</p><span>Riders Geo / PWA</span></footer>
    </main>
  </div>;
}
