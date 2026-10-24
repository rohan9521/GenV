import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage, ToolLogEntry } from '../types';

const examples = [
  { title: 'Coastal cruise', prompt: 'Create a cinematic sports-car cruise along a coastal highway at golden hour, with ocean views, warm reflections, and a smooth tracking camera.' },
  { title: 'Neon night race', prompt: 'A high-energy night race through a neon city, with glowing signs, wet asphalt reflections, and dramatic low-angle camera movement.' },
  { title: 'Mountain rally', prompt: 'A rally-inspired drive on a winding mountain pass at dawn, with mist, pine trees, and sweeping aerial-to-close camera shots.' },
  { title: 'Desert sunset', prompt: 'A dramatic desert highway run at sunset, with long shadows, dust in the distance, and a bold cinematic title.' },
];

const optionGroups = {
  paint: ['Electric blue', 'Racing red', 'Pearl white', 'Midnight black', 'Sunset orange', 'Custom / choose for me'],
  style: ['RX-7 sports coupe', 'Track-day race build', 'Retro street build', 'Futuristic concept styling'],
  motion: ['Smooth cruise', 'Hard acceleration', 'Drift-inspired cornering'],
  lighting: ['Bright daylight', 'Golden hour', 'Blue hour', 'Neon night', 'Rainy night'],
  setting: ['Coastal highway', 'Mountain pass', 'Desert highway', 'Neon city street', 'Race circuit'],
  camera: ['360° orbit around the car', 'Fixed cinematic camera'],
} as const;

const paintHex: Record<(typeof optionGroups.paint)[number], string | undefined> = {
  'Electric blue': '#596FFF',
  'Racing red': '#E53935',
  'Pearl white': '#F4F1E8',
  'Midnight black': '#10131C',
  'Sunset orange': '#FF7A3D',
  'Custom / choose for me': undefined,
};

type ChatPanelProps = {
  messages: ChatMessage[];
  tools: ToolLogEntry[];
  busy: boolean;
  onGenerate: (prompt: string) => void;
};

export function ChatPanel({ messages, tools, busy, onGenerate }: ChatPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [paint, setPaint] = useState<(typeof optionGroups.paint)[number]>(optionGroups.paint[0]);
  const [style, setStyle] = useState<(typeof optionGroups.style)[number]>(optionGroups.style[0]);
  const [motion, setMotion] = useState<(typeof optionGroups.motion)[number]>(optionGroups.motion[0]);
  const [lighting, setLighting] = useState<(typeof optionGroups.lighting)[number]>(optionGroups.lighting[1]);
  const [setting, setSetting] = useState<(typeof optionGroups.setting)[number]>(optionGroups.setting[0]);
  const [camera, setCamera] = useState<(typeof optionGroups.camera)[number]>(optionGroups.camera[0]);
  const [showTools, setShowTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, tools]);

  function submitPrompt() {
    const text = prompt.trim();
    if (!text || busy) return;
    setPrompt('');
    const preferences = [
      `Car paint: ${paintHex[paint] ? `${paint} (${paintHex[paint]})` : `${paint}; choose an exact #RRGGBB hex color`}.`,
      `Car style direction: ${style}. The built-in preview model remains an RX-7 sports coupe.`,
      `Driving mood: ${motion}.`,
      `Time of day and lighting: ${lighting}.`,
      `Scene setting: ${setting}.`,
      `Camera shot: ${camera}. For a 360° orbit, include camera.orbit {turns: 1}; for a fixed camera, omit camera.orbit.`,
    ].join(' ');
    onGenerate(`${text}\n\nApply these car-scene preferences when relevant: ${preferences} If the requested scene is not about a car, prioritize the requested scene.`);
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

      <div className="creative-options">
        <span className="eyebrow">CAR SCENE OPTIONS</span>
        <label className="creative-field">Paint color
          <select value={paint} onChange={(event) => setPaint(event.target.value as (typeof optionGroups.paint)[number])}>
            {optionGroups.paint.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="creative-field">Car type / style
          <select value={style} onChange={(event) => setStyle(event.target.value as (typeof optionGroups.style)[number])}>
            {optionGroups.style.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="creative-field">Driving dynamics
          <select value={motion} onChange={(event) => setMotion(event.target.value as (typeof optionGroups.motion)[number])}>
            {optionGroups.motion.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="creative-field">Time / lighting
          <select value={lighting} onChange={(event) => setLighting(event.target.value as (typeof optionGroups.lighting)[number])}>
            {optionGroups.lighting.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="creative-field">Scene setting
          <select value={setting} onChange={(event) => setSetting(event.target.value as (typeof optionGroups.setting)[number])}>
            {optionGroups.setting.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="creative-field">Camera shot
          <select value={camera} onChange={(event) => setCamera(event.target.value as (typeof optionGroups.camera)[number])}>
            {optionGroups.camera.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>
        <span className="creative-hint">Style guides the scene; the model stays an RX-7 with built-in driving physics.</span>
      </div>

      {messages.length < 3 && (
        <div className="example-prompts">
          <span className="eyebrow">TRY A STARTER</span>
          {examples.map((example) => <button key={example.title} onClick={() => setPrompt(example.prompt)}>{example.title}<span>↗</span></button>)}
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
