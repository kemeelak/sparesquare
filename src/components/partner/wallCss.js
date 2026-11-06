// The dump wall's own stylesheet. Everything here is scoped to the dump section:
// kraft board, pinned cards, tape, pins, and the thread that ties an answer to a dump.
export const WALL_CSS = `
.tw-wall{
  background-color:#d9bd8d;
  background-image:radial-gradient(ellipse at 12% 18%,rgba(255,255,255,.18) 0 1px,transparent 2px),radial-gradient(ellipse at 78% 72%,rgba(91,61,32,.12) 0 1px,transparent 2px),repeating-linear-gradient(14deg,transparent 0 8px,rgba(117,83,48,.035) 9px 10px);
  border:1px solid #b69a6f;
  box-shadow:0 12px 34px rgba(72,50,26,.16);
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:#28353b;
}
.tw-top{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start}
.tw-pairs{display:flex;flex-direction:column;gap:34px}
.tw-pair{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:start}

.tw-note{position:relative;background:#fff7e7;padding:34px 36px 31px;box-shadow:0 8px 18px rgba(61,45,25,.16);transform:rotate(-1.4deg);border:1px solid rgba(95,75,49,.12);animation:tw-arrive .65s cubic-bezier(.2,.8,.25,1) both}
.tw-note:before{content:"";position:absolute;width:74px;height:19px;left:50%;top:-10px;transform:translateX(-50%) rotate(-2deg);background:rgba(240,218,160,.8);box-shadow:0 1px 2px rgba(70,50,20,.1)}
.tw-note-answer{background:#e7eff0;transform:rotate(1.2deg);animation-delay:.12s}
.tw-note-answer:before{background:rgba(174,203,204,.83);transform:translateX(-50%) rotate(3deg)}

.tw-h2{font-size:38px;line-height:1.05;letter-spacing:-1.7px;font-weight:850;margin:0 0 18px;color:#24353a}
.tw-copy{font-size:17px;line-height:1.65;color:#586369;max-width:510px;margin:0}
.tw-small{font-size:13px;line-height:1.5;color:#747a76;margin:17px 0 0}
.tw-scribble{font-size:17px;font-style:italic;font-weight:600;color:#566e73;line-height:1.55;margin:0}
.tw-pin{position:absolute;width:11px;height:11px;border-radius:50%;background:#d9674d;top:13px;right:16px;box-shadow:0 2px 0 rgba(84,46,34,.25)}
.tw-pin-alt{background:#66878a;box-shadow:0 2px 0 rgba(38,63,66,.25)}

.tw-stamp{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#84877e;margin:0 0 10px}
.tw-body{font-size:16px;line-height:1.6;color:#33464a;margin:0;white-space:pre-wrap}
.tw-photo{width:100%;max-height:210px;object-fit:cover;margin-top:13px;border:1px solid rgba(95,75,49,.16);box-shadow:0 2px 8px rgba(61,45,25,.14)}

.tw-join{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:46px;display:grid;place-items:center;z-index:2}
.tw-join:before{content:"";position:absolute;width:72px;height:1px;background:#596f70;left:0;top:50%;transform-origin:left center;animation:tw-taut .7s cubic-bezier(.15,.8,.2,1) .35s both}
.tw-seal{z-index:1;width:46px;height:46px;border-radius:50%;background:#d9bd8d;border:1px solid rgba(93,71,41,.28);display:grid;place-items:center;box-shadow:0 2px 7px rgba(72,50,26,.12)}
.tw-seal svg{width:21px;height:21px;stroke:#536b6d;fill:none;stroke-width:1.8}

.tw-center{position:relative;display:flex;align-items:center;justify-content:center;flex:1;min-height:0}
.tw-center:before{content:"";position:absolute;width:1px;height:100%;background:rgba(94,72,43,.12);left:50%}
.tw-center:after{content:"";position:absolute;width:72px;height:1px;background:#596f70;left:calc(50% - 36px);top:50%;transform-origin:left center;animation:tw-taut .7s cubic-bezier(.15,.8,.2,1) .35s both}

.tw-composer{position:relative;background:#fffaf0;border:1px solid #c9b58f;padding:21px 24px 18px;box-shadow:0 9px 20px rgba(61,45,25,.17);transform:rotate(.35deg);animation:tw-arrive .7s cubic-bezier(.2,.8,.25,1) .2s both}
.tw-composer:before{content:"";position:absolute;width:62px;height:17px;top:-9px;left:37px;background:rgba(232,204,145,.88);transform:rotate(-4deg)}
.tw-compose-row{display:flex;align-items:flex-end;gap:14px}
.tw-round,.tw-tool,.tw-send,.tw-stop{border:0;cursor:pointer;display:grid;place-items:center;transition:background-color .18s,box-shadow .18s,transform .18s;color:#33464a}
.tw-round{width:48px;height:48px;flex:none;border-radius:50%;background:#e9b56d;box-shadow:0 3px 0 #c18d4e}
.tw-round:hover{background:#f0c681;box-shadow:0 4px 9px #9a774c55}
.tw-round:active,.tw-tool:active,.tw-send:active,.tw-stop:active,.tw-do:active,.tw-later:active{transform:scale(.94)}
.tw-round:focus-visible,.tw-tool:focus-visible,.tw-send:focus-visible,.tw-stop:focus-visible,.tw-do:focus-visible,.tw-later:focus-visible,textarea:focus-visible{outline:3px solid #547a7d;outline-offset:3px}
.tw-round svg,.tw-tool svg,.tw-send svg,.tw-stop svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tw-textarea{box-sizing:border-box;resize:none;flex:1;min-width:0;height:66px;padding:16px 18px;border:1px solid #d8ccae;border-radius:8px;background:#fffdf8;color:#26383d;font:16px/1.45 system-ui,-apple-system,sans-serif;box-shadow:inset 0 1px 3px rgba(76,55,29,.06)}
.tw-textarea::placeholder{color:#84877e;opacity:1}
.tw-tool{width:44px;height:44px;border-radius:10px;background:#f0eadb;flex:none}
.tw-tool:hover{background:#e4d8bc}
.tw-send{width:48px;height:48px;border-radius:10px;background:#354d51;color:#fff;flex:none;box-shadow:0 3px 0 #243b3e}
.tw-send:hover{background:#49666a;box-shadow:0 4px 9px #30484b55}
.tw-send:disabled,.tw-round:disabled,.tw-tool:disabled{opacity:.42;box-shadow:none;cursor:not-allowed}
.tw-stop{width:48px;height:48px;flex:none;border-radius:50%;background:#d4674e;color:#fff;box-shadow:0 3px 0 #a8482f}
.tw-stop:hover{background:#df7b61}
.tw-live{width:11px;height:11px;border-radius:50%;background:#d4674e;animation:tw-pulse 1.1s ease-in-out infinite;flex:none}
.tw-timer{font:600 15px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#26383d;flex:none}
.tw-listening{flex:1;min-width:0;font-size:13px;color:#75786e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tw-transcribing{display:flex;align-items:center;gap:14px;height:66px;padding:0 4px;color:#566e73;font-size:15px}
.tw-hint{margin:12px 0 0 62px;font-size:13px;line-height:1.45;color:#75786e}
.tw-error{margin:12px 0 0 62px;font-size:13px;line-height:1.45;color:#a8482f}
.tw-thumb-wrap{position:relative;display:inline-block;margin-bottom:12px}
.tw-thumb{height:96px;width:96px;object-fit:cover;display:block;border:1px solid rgba(95,75,49,.2);box-shadow:0 4px 10px rgba(61,45,25,.16);transform:rotate(-1.5deg)}
.tw-dismiss{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#354d51;color:#fff;border:0;display:grid;place-items:center;cursor:pointer}
.tw-dismiss:focus-visible{outline:3px solid #547a7d;outline-offset:2px}

.tw-action-title{font-size:16px;font-weight:700;color:#24353a;margin:15px 0 1px;line-height:1.25}
.tw-action-copy{font-size:13px;line-height:1.5;color:#586369;margin:0}
.tw-action-meta{font-size:12px;color:#747a76;margin:7px 0 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tw-actions{margin-top:15px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tw-do{border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:8px;background:#354d51;color:#fff;font:600 12px/1 system-ui,-apple-system,sans-serif;box-shadow:0 3px 0 #243b3e;transition:background-color .18s,box-shadow .18s,transform .18s}
.tw-do:hover{background:#49666a;box-shadow:0 4px 9px #30484b55}
.tw-later{border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:9px 12px;border-radius:8px;background:#f0eadb;color:#33464a;font:600 12px/1 system-ui,-apple-system,sans-serif;transition:background-color .18s,transform .18s}
.tw-later:hover{background:#e4d8bc}
.tw-kept{margin-top:15px;display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#566e73}
.tw-drop{margin-left:auto;border:0;background:transparent;color:#84877e;cursor:pointer;display:grid;place-items:center;padding:4px}
.tw-drop:hover{color:#d4674e}

.tw-dock{position:absolute;right:30px;bottom:26px;display:flex;gap:8px;opacity:.75}
.tw-dock i{display:block;width:9px;height:9px;border-radius:50%;background:#d4674e}
.tw-dock i:nth-child(2){background:#66878a}
.tw-dock i:nth-child(3){background:#e8b263}

@keyframes tw-arrive{from{opacity:0;transform:translateY(-10px) rotate(0deg)}to{opacity:1}}
@keyframes tw-taut{0%{transform:scaleX(.05);opacity:.35}100%{transform:scaleX(1);opacity:1}}
@keyframes tw-pulse{0%,100%{opacity:1}50%{opacity:.35}}

@media (max-width:767px){
  .tw-top{grid-template-columns:1fr;gap:20px}
  .tw-pair{grid-template-columns:1fr;gap:20px}
  .tw-join{display:none}
  .tw-h2{font-size:30px;letter-spacing:-1.2px}
  .tw-note{padding:26px 22px 24px}
  .tw-copy{font-size:16px}
  .tw-hint,.tw-error{margin-left:0}
}
`;