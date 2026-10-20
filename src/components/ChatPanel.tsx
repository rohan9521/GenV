import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage, ToolLogEntry } from '../types';

const examples = [
  'Create a cinematic 8-second 3D football scene: a stylized player in a blue kit runs up, kicks a black-and-white football toward the goal, and celebrates. Add a green pitch with white markings, two goalposts, stadium floodlights, dramatic crowd-colored background, and a slow camera push-in. Use a footballer object with football-kick animation and a football object with football-roll animation. Keep the player, ball, and goal clearly visible; use smooth motion and polished broadcast lighting.',
  'A luminous glass sphere orbiting a chrome ring',
  'A red cube unfolds into a field of stars',
  'Minimal title card: “Made of motion” in warm gold',
];

type ChatPanelProps = {
  messages: ChatMessage[];
  tools: ToolLogEntry[];
  busy: boolean;
  onGenerate: (prompt: string) => void;
};

export function ChatPanel({ messages, tools, busy, onGenerate }: ChatPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, tools]);

  function submitPrompt() {
    const text = prompt.trim();
    if (!text || busy) return;
    setPrompt('');
    onGenerate(text);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    submitPrompt();
  }

  return (
    <aside className="chat-panel">
      <div className="panel-heading">
        <div><div className="eyebrow">CREATIVE ASSISTANT</div><h1>What are we making?</h1></div>
        <span className="sparkle">✳</span>
      </div>

      <div className="conversation" ref={scrollRef} aria-live="polite">
        {messages.map((item, index) => (
          <div className={`chat-row ${item.role}`} key={`${index}-${item.text}`}>
            <span className="avatar">{item.role === 'assistant' ? '✳' : 'Y'}</span>
            <div className="bubble">
              <span className="speaker">{item.role === 'assistant' ? 'FRAMEFORGE' : 'YOU'}</span>
              <p>{item.text}</p>
            </div>
          </div>
        ))}
        {busy && <div className="thinking"><span className="pulse" /> Mapping out your scene<span className="dots">•••</span></div>}
        {tools.length > 0 && (
          <div className="tool-log">
            <button className="tool-toggle" onClick={() => setShowTools(!showTools)} aria-expanded={showTools}>
              <span>⌘</span> {tools.length} scene updates <span className="chevron">{showTools ? '⌃' : '⌄'}</span>
            </button>
            {showTools && tools.map((tool, index) => (
              <div className="tool-entry" key={`${tool.name}-${index}`}>
                <span className={tool.ok ? 'tool-status ok' : 'tool-status fail'}>{tool.ok ? '✓' : '!'}</span>
                <div><strong>{tool.name.replaceAll('_', ' ')}</strong>{tool.error && <small>{tool.error}</small>}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {messages.length < 3 && (
        <div className="example-prompts">
          <span className="eyebrow">TRY A STARTER</span>
          {examples.map((example, index) => <button key={example} onClick={() => setPrompt(example)}>{index === 0 ? '⚽ Generate a football kick scene' : example}<span>↗</span></button>)}
        </div>
      )}

      <form className="prompt-box" onSubmit={submit}>
        <label className="sr-only" htmlFor="prompt">Describe your video</label>
        <textarea id="prompt" rows={3} placeholder="Describe a scene, a feeling, a moment…" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitPrompt(); }
        }} />
        <div className="prompt-bottom">
          <span><kbd>↵</kbd> to generate · <kbd>⇧ ↵</kbd> for new line</span>
          <button className="send-button" type="submit" aria-label="Generate scene" disabled={!prompt.trim() || busy}>↑</button>
        </div>
      </form>
    </aside>
  );
}
