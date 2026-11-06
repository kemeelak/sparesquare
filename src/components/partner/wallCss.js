// The dump section's stylesheet, dressed in the same language as the rest of the app:
// stone surfaces, white cards, charcoal ink, sage and amber accents, soft radii.
export const WALL_CSS = `
.tw-wall{
  background-color:transparent;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color:#1A1A1A;
  -webkit-tap-highlight-color:transparent;
}
.tw-wall button,.tw-wall a,.tw-note-btn{touch-action:manipulation}
.tw-scroll{-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:rgba(26,26,26,.16) transparent}
.tw-scroll::-webkit-scrollbar{width:9px}
.tw-scroll::-webkit-scrollbar-thumb{background:rgba(26,26,26,.14);border-radius:99px;border:2px solid transparent;background-clip:content-box}
.tw-scroll::-webkit-scrollbar-track{background:transparent}
.tw-empty{display:flex;flex-direction:column;justify-content:center;gap:20px;min-height:100%;max-width:760px;margin:0 auto;padding:28px 30px 24px}
.tw-empty-line{font-size:12.5px;line-height:1.5;color:#8A8580;margin:0;max-width:520px}
.tw-pairs-wrap{padding:26px 30px 30px}

.tw-top{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
.tw-pairs{display:flex;flex-direction:column;gap:24px}
.tw-pair{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}

.tw-note{position:relative;background:#FFFFFF;padding:26px 26px 24px;border-radius:16px;border:1px solid #E8E4DF;box-shadow:0 1px 2px rgba(26,26,26,.04);animation:tw-arrive .4s cubic-bezier(.2,.8,.25,1) both}
.tw-note-answer{background:#F5F0EB;border-color:#E8E4DF;animation-delay:.08s}

.tw-h2{font-size:28px;line-height:1.12;letter-spacing:-.9px;font-weight:600;margin:0 0 12px;color:#1A1A1A}
.tw-copy{font-size:15px;line-height:1.6;color:#5C5C5C;max-width:510px;margin:0}
.tw-small{font-size:13px;line-height:1.5;color:#8A8580;margin:14px 0 0}
.tw-scribble{font-size:16px;font-style:italic;font-weight:500;color:#4A5568;line-height:1.55;margin:0}
.tw-pin{display:none}
.tw-pin-alt{display:none}

.tw-stamp{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8A8580;margin:0 0 10px;font-weight:600}
.tw-body{font-size:15.5px;line-height:1.65;color:#2C2C2C;margin:0;white-space:pre-wrap}
.tw-photo{width:100%;max-height:210px;object-fit:cover;margin-top:13px;border-radius:12px;border:1px solid #E8E4DF}

.tw-join{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72px;height:46px;display:grid;place-items:center;z-index:2}
.tw-join:before{content:"";position:absolute;width:72px;height:1px;background:#E8E4DF;left:0;top:50%;transform-origin:left center;animation:tw-taut .7s cubic-bezier(.15,.8,.2,1) .35s both}
.tw-seal{z-index:1;width:40px;height:40px;border-radius:50%;background:#FFFFFF;border:1px solid #E8E4DF;display:grid;place-items:center;box-shadow:0 1px 3px rgba(26,26,26,.06)}
.tw-seal svg{width:19px;height:19px;stroke:#7C9A82;fill:none;stroke-width:1.8}

.tw-center{position:relative;display:flex;align-items:center;justify-content:center;flex:1;min-height:0}
.tw-center:before{content:"";position:absolute;width:1px;height:100%;background:#E8E4DF;left:50%}
.tw-center:after{content:"";position:absolute;width:72px;height:1px;background:#E8E4DF;left:calc(50% - 36px);top:50%;transform-origin:left center;animation:tw-taut .7s cubic-bezier(.15,.8,.2,1) .35s both}

.tw-bar{flex:none;padding:12px 26px calc(16px + env(safe-area-inset-bottom));background:#FAF8F5;border-top:1px solid #E8E4DF}
.tw-composer{position:relative;background:#FFFFFF;border:1px solid #E8E4DF;border-radius:16px;padding:12px 14px 10px;box-shadow:0 1px 2px rgba(26,26,26,.04)}
.tw-compose-row{display:flex;align-items:flex-end;gap:10px}
.tw-round,.tw-tool,.tw-send,.tw-stop{border:0;cursor:pointer;display:grid;place-items:center;transition:background-color .18s,box-shadow .18s,transform .18s;color:#1A1A1A}
.tw-round{width:48px;height:48px;flex:none;border-radius:50%;background:#D4A574;box-shadow:none}
.tw-round:hover{background:#C79761}
.tw-round:active,.tw-tool:active,.tw-send:active,.tw-stop:active,.tw-do:active,.tw-later:active{transform:scale(.94)}
.tw-round:focus-visible,.tw-tool:focus-visible,.tw-send:focus-visible,.tw-stop:focus-visible,.tw-do:focus-visible,.tw-later:focus-visible,textarea:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-round svg,.tw-tool svg,.tw-send svg,.tw-stop svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.tw-textarea{box-sizing:border-box;resize:none;flex:1;min-width:0;height:auto;min-height:52px;max-height:132px;overflow-y:auto;padding:13px 15px;border:1px solid #E8E4DF;border-radius:12px;background:#FFFFFF;color:#1A1A1A;font:16px/1.45 'Inter',system-ui,sans-serif;transition:border-color .15s}
.tw-textarea::placeholder{color:#8A8580;opacity:1}
.tw-tool{width:44px;height:44px;border-radius:12px;background:#F5F0EB;flex:none;color:#4A5568}
.tw-tool:hover{background:#EAE4DD}
.tw-send{width:48px;height:48px;border-radius:12px;background:#1A1A1A;color:#FFFFFF;flex:none}
.tw-send:hover{background:#333333}
.tw-send:disabled,.tw-round:disabled,.tw-tool:disabled{opacity:.4;cursor:not-allowed}
.tw-stop{width:48px;height:48px;flex:none;border-radius:50%;background:#C0533F;color:#FFFFFF}
.tw-stop:hover{background:#AE4733}
.tw-live{width:10px;height:10px;border-radius:50%;background:#C0533F;animation:tw-pulse 1.1s ease-in-out infinite;flex:none}
.tw-timer{font:600 15px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#1A1A1A;flex:none}
.tw-listening{flex:1;min-width:0;font-size:13px;color:#8A8580;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tw-transcribing{display:flex;align-items:center;gap:14px;min-height:52px;padding:0 4px;color:#4A5568;font-size:15px}
.tw-hint{margin:10px 0 0;font-size:12.5px;line-height:1.45;color:#8A8580}
.tw-error{margin:10px 0 0;font-size:12.5px;line-height:1.45;color:#C0533F}
.tw-thumb-wrap{position:relative;display:inline-block;margin-bottom:12px}
.tw-thumb{height:96px;width:96px;object-fit:cover;display:block;border-radius:12px;border:1px solid #E8E4DF}
.tw-dismiss{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#1A1A1A;color:#fff;border:0;display:grid;place-items:center;cursor:pointer}
.tw-dismiss:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}

.tw-action-title{font-size:16px;font-weight:600;color:#1A1A1A;margin:15px 0 2px;line-height:1.3}
.tw-action-copy{font-size:13px;line-height:1.5;color:#5C5C5C;margin:0}
.tw-action-meta{font-size:12px;color:#8A8580;margin:7px 0 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tw-actions{margin-top:15px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.tw-move-acts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px}
/* a layer can be swiped away to the left */
.tw-swipe{position:relative;overflow:hidden;border-radius:12px}
.tw-swipe-hint{position:absolute;top:50%;right:6px;transform:translateY(-50%);font:600 10px/1 'Inter',-apple-system,sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#C0533F;pointer-events:none}
.tw-swipe-body{position:relative;background:#FAF8F5;border-radius:12px;padding:0 6px;margin:0 -6px;will-change:transform}
.tw-swipe-note{margin:0;font-size:11px;letter-spacing:.04em;color:#B0AAA4}
@media (min-width:1024px){.tw-swipe-note{display:none}}
.tw-mini{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;padding:4px 0;color:#8A8580;font:600 11.5px/1 'Inter',-apple-system,sans-serif;cursor:pointer;transition:color .16s}
.tw-mini:hover{color:#1A1A1A}
.tw-mini:disabled{opacity:.5;cursor:default}
.tw-mini:focus-visible{outline:2px solid #7C9A82;outline-offset:3px;border-radius:4px}
.tw-mini svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.tw-mini+.tw-mini{border-left:1px solid #E8E4DF;padding-left:10px}
.tw-move-done{display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.04em;text-transform:uppercase;font-weight:600;color:#7C9A82}
.tw-move-done svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.tw-do{border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:10px;background:#1A1A1A;color:#FFFFFF;font:600 12px/1 'Inter',-apple-system,sans-serif;transition:background-color .18s,transform .18s}
.tw-do:hover{background:#333333}
.tw-later{border:0;cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:10px 14px;border-radius:10px;background:#F5F0EB;color:#1A1A1A;font:600 12px/1 'Inter',-apple-system,sans-serif;transition:background-color .18s,transform .18s}
.tw-later:hover{background:#EAE4DD}
.tw-kept{margin-top:15px;display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7C9A82;font-weight:600}

.tw-card-tools{position:absolute;bottom:10px;right:12px;display:flex;gap:4px;opacity:0;transition:opacity .18s}
.tw-note:hover .tw-card-tools,.tw-card-tools:focus-within{opacity:1}
.tw-icon-btn{width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:#8A8580;display:grid;place-items:center;cursor:pointer;transition:background-color .18s,color .18s}
.tw-icon-btn:hover{background:#F5F0EB;color:#1A1A1A}
.tw-icon-btn:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-icon-danger:hover{background:#FBEFEC;color:#C0533F}
.tw-edit{box-sizing:border-box;width:100%;min-height:96px;resize:vertical;padding:12px 14px;border:1px solid #E8E4DF;border-radius:12px;background:#FFFFFF;color:#1A1A1A;font:16px/1.55 'Inter',system-ui,sans-serif}
.tw-edit:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-foot{margin-top:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}

.tw-do-danger{background:#C0533F}
.tw-do-danger:hover{background:#AE4733}
.tw-do-done{background:#7C9A82}
.tw-do-done:hover{background:#6E8B74}
.tw-moved{margin-top:15px;display:flex;flex-direction:column;gap:7px}
.tw-moved-text{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:#1A1A1A;line-height:1.35}
.tw-moved-link{display:inline-flex;align-items:center;gap:5px;align-self:flex-start;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:#7C9A82;text-decoration:none;padding-bottom:2px;transition:color .18s}
.tw-moved-link:hover{color:#6E8B74}
.tw-moved-link:focus-visible{outline:2px solid #7C9A82;outline-offset:3px;border-radius:4px}
.tw-drop{margin-left:auto;border:0;background:transparent;color:#8A8580;cursor:pointer;display:grid;place-items:center;padding:4px}
.tw-drop:hover{color:#C0533F}

.tw-lib-chip{display:inline-flex;align-items:center;gap:6px;margin:12px 0 0;padding:5px 10px;border-radius:99px;background:#E8F0EA;border:1px solid #DCE7DF;font-size:11px;letter-spacing:.02em;color:#4F6B57}
.tw-draft-btn{margin-top:14px}
.tw-draft{margin-top:16px;padding-top:14px;border-top:1px solid #E8E4DF}
.tw-draft-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.tw-draft-head .tw-stamp{margin:0}
.tw-draft-loading{margin:16px 0 0;padding-top:14px;border-top:1px solid #E8E4DF;display:flex;align-items:center;gap:9px;font-size:13px;color:#8A8580}
.tw-draft-subject{box-sizing:border-box;width:100%;padding:11px 13px;border:1px solid #E8E4DF;border-radius:10px;background:#FFFFFF;color:#1A1A1A;font:600 15px/1.35 'Inter',system-ui,sans-serif}
.tw-draft-subject:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-draft-body{margin-top:9px;min-height:150px}
.tw-foot a.tw-later{text-decoration:none}

.tw-note-btn{cursor:pointer;transition:box-shadow .2s,transform .2s}
.tw-note-btn:hover{box-shadow:0 8px 22px rgba(26,26,26,.08);transform:translateY(-2px)}
.tw-note-btn:focus-visible{outline:2px solid #7C9A82;outline-offset:3px}
.tw-note-cta{margin:18px 0 0;display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;color:#8A8580}

.tw-sheet-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(26,26,26,.4);backdrop-filter:blur(2px);animation:tw-fade .2s ease both}
.tw-sheet{position:relative;width:100%;max-width:760px;max-height:calc(100% - 8px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:#FFFFFF;border:1px solid #E8E4DF;border-radius:20px;box-shadow:0 20px 48px rgba(26,26,26,.2);padding:24px 26px 20px;animation:tw-arrive .3s cubic-bezier(.2,.8,.25,1) both}
.tw-sheet-grip{display:none}
.tw-sheet-head{display:flex;align-items:flex-start;gap:14px}
.tw-sheet-title{font-size:24px;letter-spacing:-.5px;font-weight:600;color:#1A1A1A;margin:2px 0 0;line-height:1.15}
.tw-sheet-close{margin-left:auto;flex:none;width:34px;height:34px;border-radius:10px;border:0;background:#F5F0EB;color:#1A1A1A;display:grid;place-items:center;cursor:pointer;transition:background-color .18s,transform .18s}
.tw-sheet-close:hover{background:#EAE4DD}
.tw-sheet-close:active{transform:scale(.94)}
.tw-sheet-close:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-sheet-loading{margin:18px 0 0;display:flex;align-items:center;gap:8px;font-size:13px;color:#8A8580}
.tw-sheet-empty{margin:18px 0 0}
.tw-sheet-empty .tw-small{margin-top:0}
.tw-sheet-empty .tw-later{margin-top:12px}
.tw-sheet-foot{margin:18px 0 0;font-size:12px;line-height:1.5;color:#8A8580}
.tw-suggests{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}
.tw-suggest{display:flex;flex-direction:column;background:#FAF8F5;border:1px solid #E8E4DF;border-radius:14px;padding:16px 17px 14px}
.tw-suggest-title{font-size:15px;font-weight:600;color:#1A1A1A;margin:0;line-height:1.3}
.tw-suggest-copy{font-size:12.5px;line-height:1.5;color:#5C5C5C;margin:4px 0 0}
.tw-meta-bit{display:inline-flex;align-items:center;gap:4px}
.tw-suggest-add{margin-top:14px;align-self:flex-start}
.tw-suggest-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;align-self:flex-start}
.tw-suggest-saved{margin-top:14px;align-self:flex-start}
.tw-suggest-skel{height:104px;animation:tw-pulse 1.4s ease-in-out infinite;background:#F5F0EB;border:1px solid #E8E4DF;border-radius:14px}

.tw-dock{display:none}

@keyframes tw-arrive{from{opacity:0;transform:translateY(-6px)}to{opacity:1}}
@keyframes tw-taut{0%{transform:scaleX(.05);opacity:.35}100%{transform:scaleX(1);opacity:1}}
@keyframes tw-pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes tw-fade{from{opacity:0}to{opacity:1}}
@keyframes tw-slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}

/* ---- the wall of note fronts ---- */
.tw-wall-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:16px;padding:26px 26px 30px;align-content:start}
.tw-front{position:relative;display:flex;flex-direction:column;width:100%;text-align:left;background:#FFFFFF;border:1px solid #E8E4DF;border-radius:16px;padding:20px 18px 18px;box-shadow:0 1px 2px rgba(26,26,26,.04);cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;animation:tw-arrive .35s cubic-bezier(.2,.8,.25,1) both;color:inherit;font:inherit}
.tw-front:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(26,26,26,.08);border-color:#DCD6CF}
.tw-front:active{transform:scale(.99)}
.tw-front:focus-visible{outline:2px solid #7C9A82;outline-offset:3px}
.tw-front-title{font-size:16px;font-weight:600;letter-spacing:-.2px;line-height:1.35;color:#1A1A1A;margin:0;overflow-wrap:anywhere}
.tw-front-snippet{font-size:13px;line-height:1.55;color:#8A8580;margin:6px 0 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.tw-front-photo{width:100%;height:88px;object-fit:cover;margin-top:12px;border-radius:10px;border:1px solid #E8E4DF}
.tw-front-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px}
.tw-front-bit{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;letter-spacing:.02em;color:#5C5C5C;background:#F5F0EB;border-radius:99px;padding:4px 9px}
.tw-front-bit-done{color:#4F6B57;background:#E8F0EA}
.tw-front-go{position:absolute;bottom:12px;right:12px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#F5F0EB;color:#5C5C5C}
.tw-front-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-height:104px;background:transparent;border:1px dashed #DCD6CF;color:#8A8580;font-size:11px;letter-spacing:.06em;font-weight:600;box-shadow:none}
.tw-front-add:hover{background:#FFFFFF;border-color:#C9C2B9;box-shadow:none;transform:none}

/* ---- one note, opened ---- */
.tw-head{flex:none;display:flex;align-items:center;gap:10px;padding:12px 18px;background:#FFFFFF;border-bottom:1px solid #E8E4DF}
.tw-back{display:inline-flex;align-items:center;gap:6px;border:0;cursor:pointer;padding:8px 12px;border-radius:10px;background:#F5F0EB;color:#1A1A1A;font:600 11px/1 'Inter',-apple-system,sans-serif;letter-spacing:.02em;transition:background-color .18s,transform .18s}
.tw-back:hover{background:#EAE4DD}
.tw-back:active{transform:scale(.96)}
.tw-back:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-head-stamp{margin-left:auto;font-size:11px;color:#8A8580}
.tw-head-tools{display:flex;gap:2px}
.tw-detail-scroll{flex:1;min-height:0;overflow-y:auto}
.tw-detail-inner{max-width:660px;margin:0 auto;padding:24px 18px 28px;display:flex;flex-direction:column;gap:18px}
.tw-detail-title{font-size:24px;line-height:1.25;letter-spacing:-.4px;font-weight:600;color:#1A1A1A;margin:2px 0 0;overflow-wrap:anywhere;animation:tw-slide .28s cubic-bezier(.2,.8,.25,1) both}
.tw-detail-note{padding:22px 22px 20px;animation:tw-slide .3s cubic-bezier(.2,.8,.25,1) .03s both}
.tw-detail-answer{padding:22px 22px 20px;animation:tw-slide .3s cubic-bezier(.2,.8,.25,1) .08s both}
.tw-follows{display:flex;flex-direction:column;gap:10px}
.tw-follow{background:#FFFFFF;border:1px solid #E8E4DF;border-radius:14px;padding:14px 16px 12px;box-shadow:0 1px 2px rgba(26,26,26,.04);animation:tw-slide .26s cubic-bezier(.2,.8,.25,1) both}
.tw-follow-stamp{margin:8px 0 0;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#B0AAA4}
.tw-follow-photo{display:block;margin:10px 0 0;max-width:100%;max-height:220px;border-radius:10px;border:1px solid #E8E4DF}
.tw-audio{display:block;width:100%;height:36px;margin:10px 0 0}
.tw-follow-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}
.tw-follow-foot .tw-follow-stamp{margin:0}
.tw-follow-tools{display:flex;gap:2px;flex:none}
.tw-follow-tools button{border:0;background:transparent;cursor:pointer;color:#8A8580;padding:4px;border-radius:6px;display:grid;place-items:center;transition:background-color .15s,color .15s}
.tw-follow-tools button:hover{background:#F5F0EB;color:#1A1A1A}
.tw-follow-tools .tw-icon-danger:hover{background:#FBEFEC;color:#C0533F}
.tw-follow-tools svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.tw-edit-follow{min-height:70px}
.tw-attach-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.tw-voice-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:99px;background:#F5F0EB;border:1px solid #E8E4DF;font-size:12px;color:#5C5C5C}
.tw-voice-chip svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.tw-voice-chip button{border:0;background:transparent;cursor:pointer;color:#8A8580;display:grid;place-items:center;padding:2px}

/* what you wrote and what came back share one sheet */
.tw-block+.tw-block{margin-top:18px;padding-top:16px;border-top:1px solid #E8E4DF}
.tw-follow-btn{cursor:pointer;transition:background-color .16s,box-shadow .16s,transform .16s}
.tw-follow-btn:hover{box-shadow:0 6px 18px rgba(26,26,26,.07)}
.tw-follow-btn:active{transform:scale(.995)}
.tw-follow-btn:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-audio-lead{margin-top:14px;height:40px}

/* each block of text carries its own edit control */
.tw-block-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
.tw-block-head .tw-stamp{margin:0}
.tw-block-edit{display:inline-flex;align-items:center;gap:5px;border:0;cursor:pointer;padding:6px 10px;border-radius:99px;background:#F5F0EB;color:#5C5C5C;font:600 10px/1 'Inter',-apple-system,sans-serif;letter-spacing:.06em;text-transform:uppercase;transition:background-color .16s,color .16s,transform .16s}
.tw-block-edit:hover{background:#EAE4DD;color:#1A1A1A}
.tw-block-edit:active{transform:scale(.95)}
.tw-block-edit:focus-visible{outline:2px solid #7C9A82;outline-offset:2px}
.tw-block-edit svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

/* ---- going deeper: one line, read back through everything ---- */
.tw-explore-cta{display:inline-flex;align-items:center;gap:8px;margin-top:18px;padding:11px 16px;border:0;border-radius:99px;background:#1A1A1A;color:#FFFFFF;font:600 12px/1 'Inter',-apple-system,sans-serif;cursor:pointer;transition:background-color .18s,transform .18s}
.tw-explore-cta:hover{background:#333333}
.tw-explore-cta:active{transform:scale(.97)}
.tw-explore-cta:focus-visible{outline:2px solid #7C9A82;outline-offset:3px}
.tw-explore-cta svg{color:#D4A574}
.tw-explore-line{margin:0;padding:14px 16px;border-left:2px solid #D4A574;border-radius:0 10px 10px 0;background:#FAF8F5;font-size:15.5px;line-height:1.6;color:#2C2C2C;white-space:pre-wrap;overflow-wrap:anywhere}
.tw-explore-loading{display:flex;align-items:center;gap:9px;margin:0;font-size:13px;color:#8A8580}
.tw-threads{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.tw-thread{padding-left:12px;border-left:2px solid #E8E4DF}
.tw-thread-item{transition:border-color .18s}
.tw-thread-label{margin:0;font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:#5C5C5C;font-weight:600}
.tw-thread-detail{margin:7px 0 0;font-size:15px;line-height:1.6;color:#2C2C2C;animation:tw-fade .18s ease both}
.tw-thread-toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:2px 0;border:0;background:transparent;cursor:pointer;text-align:left;font-family:inherit}
.tw-thread-toggle:hover .tw-thread-label{color:#1A1A1A}
.tw-thread-toggle:focus-visible{outline:2px solid #7C9A82;outline-offset:3px;border-radius:4px}
.tw-thread-chev{width:14px;height:14px;flex:none;color:#8A8580;transition:transform .18s}
.tw-thread-chev.is-open{transform:rotate(180deg)}
.tw-ask-q-line{margin:0;font-size:16.5px;line-height:1.5;font-style:italic;font-weight:500;color:#4A5568}
.tw-ask{display:flex;flex-direction:column;gap:8px}
.tw-ask-you{align-self:flex-end;margin:0;max-width:88%;padding:10px 14px;border-radius:14px 14px 4px 14px;background:#1A1A1A;color:#FFFFFF;font-size:14px;line-height:1.5}
.tw-ask-back{margin:0;padding:12px 15px;border-radius:4px 14px 14px 14px;background:#F5F0EB;font-size:15px;line-height:1.6;color:#2C2C2C;white-space:pre-wrap}
.tw-ask-input{min-height:46px}
.tw-scribble-btn{display:block;width:100%;text-align:left;border:0;background:transparent;padding:0;cursor:pointer;font-family:inherit;transition:color .16s}
.tw-scribble-btn:hover{color:#1A1A1A}
.tw-scribble-btn:disabled{cursor:default}
.tw-scribble-btn:focus-visible{outline:2px solid #7C9A82;outline-offset:4px;border-radius:4px}
.tw-scribble-more{display:inline-flex;align-items:center;gap:5px;margin-top:11px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-style:normal;font-weight:600;color:#7C9A82}
.tw-scribble-btn:hover .tw-scribble-more{color:#6E8B74}
.tw-lap{display:flex;flex-direction:column;gap:16px}
.tw-lap+.tw-lap{margin-top:22px;padding-top:18px;border-top:1px solid #E8E4DF}
.tw-go-deeper{display:inline-flex;align-items:center;justify-content:center;gap:9px;align-self:flex-start;padding:13px 20px;border:0;border-radius:12px;background:#D4A574;color:#1A1A1A;font:600 13px/1 'Inter',-apple-system,sans-serif;cursor:pointer;transition:background-color .18s,transform .18s}
.tw-go-deeper:hover{background:#C79761}
.tw-go-deeper:active{transform:scale(.97)}
.tw-go-deeper:focus-visible{outline:2px solid #7C9A82;outline-offset:3px}
.tw-go-deeper svg:last-child{opacity:.7}

@media (max-width:767px){
  .tw-explore-cta{width:100%;justify-content:center;padding:13px 15px;font-size:13px}
  .tw-go-deeper{width:100%;align-self:stretch;padding:14px 18px;font-size:13.5px}
}

@media (hover:none){
  .tw-note-btn:hover{transform:none;box-shadow:0 1px 2px rgba(26,26,26,.04)}
  .tw-front:hover{transform:none;box-shadow:0 1px 2px rgba(26,26,26,.04)}
  .tw-card-tools{opacity:1}
}

@media (max-width:767px){
  .tw-empty{min-height:auto;justify-content:flex-start;gap:12px;padding:16px 12px 10px}
  .tw-pairs-wrap{padding:16px 12px 18px}
  .tw-top{grid-template-columns:1fr;gap:12px}
  .tw-note-quiet,.tw-center{display:none}
  .tw-pair{grid-template-columns:1fr;gap:14px}
  .tw-pairs{gap:16px}
  .tw-join{display:none}
  .tw-h2{font-size:22px;letter-spacing:-.4px;margin:0 0 8px}
  .tw-note{padding:18px 16px 16px}
  .tw-copy{font-size:14.5px;line-height:1.55}
  .tw-small{font-size:12px;margin-top:10px}
  .tw-empty-line{font-size:12px;padding:0 4px}
  .tw-note-cta{margin-top:12px;font-size:10.5px}
  .tw-scribble{font-size:15px}
  .tw-body{font-size:15px}
  .tw-hint,.tw-error{margin:8px 0 0;font-size:12px}
  .tw-bar{padding:10px 12px calc(12px + env(safe-area-inset-bottom))}
  .tw-composer{padding:10px 10px 9px;border-radius:14px}
  .tw-compose-row{gap:8px}
  .tw-compose-stack{flex-wrap:wrap}
  .tw-compose-stack .tw-textarea{order:-1;flex:1 1 100%;min-height:46px;padding:11px 13px}
  .tw-compose-stack .tw-round{margin-right:auto}
  .tw-round,.tw-send{width:44px;height:44px}
  .tw-tool{width:40px;height:40px}
  .tw-card-tools{opacity:1;position:static;justify-content:flex-end;margin-top:8px}

  .tw-sheet-backdrop{padding:0;align-items:flex-end}
  .tw-sheet{max-width:none;max-height:90dvh;padding:16px 16px calc(18px + env(safe-area-inset-bottom));border-radius:20px 20px 0 0;border-bottom:0;box-shadow:0 -12px 40px rgba(26,26,26,.22)}
  .tw-sheet-grip{display:block;width:44px;height:4px;border-radius:99px;background:#E8E4DF;margin:0 auto 14px}
  .tw-sheet-title{font-size:20px;letter-spacing:-.3px}
  .tw-sheet-close{width:38px;height:38px}
  .tw-suggests{grid-template-columns:1fr;gap:10px;margin-top:14px}
  .tw-suggest{padding:14px 14px 13px}
  .tw-suggest-title{font-size:15px}
  .tw-suggest-copy{font-size:13px}
  .tw-suggest-add,.tw-suggest-saved{width:100%;align-self:stretch;justify-content:center;padding:12px 14px;font-size:13px}
  .tw-suggest-acts{width:100%;align-self:stretch;flex-direction:column}
  .tw-suggest-acts .tw-do,.tw-suggest-acts .tw-later{width:100%;justify-content:center;padding:12px 14px;font-size:13px}
  .tw-sheet-foot{margin-top:14px}
  .tw-wall-grid{grid-template-columns:1fr;gap:12px;padding:16px 12px 20px}
  .tw-front{padding:18px 16px 16px}
  .tw-front-title{font-size:15.5px}
  .tw-front-photo{height:74px}
  .tw-front-add{min-height:84px}
  .tw-detail-inner{padding:16px 12px 22px;gap:14px}
  .tw-detail-title{font-size:21px;letter-spacing:-.2px}
  .tw-detail-note,.tw-detail-answer{padding:18px 16px 16px}
  .tw-head{padding:10px 12px}

  /* phones: every control is a full-width tap, nothing to mis-hit */
  .tw-block-head{gap:8px;margin-bottom:8px}
  .tw-block-edit{padding:7px 11px;font-size:10.5px}
  .tw-block-edit svg{width:13px;height:13px}
  .tw-actions{gap:8px}
  .tw-actions .tw-do,.tw-actions .tw-later{flex:1 1 100%;justify-content:center;padding:12px 12px;font-size:13px}
  .tw-actions .tw-drop{margin-left:auto;padding:8px}
  .tw-draft-btn{width:100%;justify-content:center;padding:12px 12px;font-size:13px;margin-top:12px}
  .tw-draft-body{min-height:180px}
  .tw-foot .tw-do,.tw-foot .tw-later{flex:1 1 auto;justify-content:center;padding:11px 12px}
  .tw-detail-inner{padding-bottom:calc(22px + env(safe-area-inset-bottom))}
  .tw-head-stamp{display:none}
}
`;