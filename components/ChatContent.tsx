'use client';

import { RedoOutlined, ShareAltOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Actions, Bubble, Think } from '@ant-design/x';
import type { ActionsProps, BubbleItemType } from '@ant-design/x';
import { Avatar } from 'antd';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import favicon from '../app/favicon.ico';

import {
	CHAT_FIRST_USER_MESSAGE_EVENT,
	SIDEBAR_ACTIVE_CONVERSATION_EVENT,
	SIDEBAR_NEW_CONVERSATION_EVENT,
	type SidebarActiveConversationDetail,
	type SidebarNewConversationDetail,
} from './chatEvents';
import Prompt from './Prompt';

const ChatSender = dynamic(() => import('./ChatSender'), {
	ssr: false,
	loading: () => (
		<div
			className='w-full rounded-2xl'
			style={{ minHeight: 56 }}
		/>
	),
});

type ChatMessage = {
	key: string;
	role: 'user' | 'ai' | 'system';
	content: string;
	reasoning?: string;
	loading?: boolean;
	streaming?: boolean;
};

const AI_KEY_PREFIX = 'ai-';
const USER_KEY_PREFIX = 'user-';

const MOCK_CONVERSATION_MESSAGES: Record<string, ChatMessage[]> = {
	'conv-1': [
		{
			key: 'user-1001',
			role: 'user',
			content: '我想搭一个可扩展的前端设计系统。',
		},
		{
			key: 'ai-1001',
			role: 'ai',
			content:
				'建议先定义 token、基础组件和页面模板三层结构，再通过统一规范做版本化管理。',
		},
	],
	'conv-2': [
		{
			key: 'user-1002',
			role: 'user',
			content: 'Tailwind 和 Styled Components 怎么选？',
		},
		{
			key: 'ai-1002',
			role: 'ai',
			content:
				'如果你要更高开发速度与一致规范，优先 Tailwind；若强调组件封装隔离可选 Styled Components。',
		},
	],
	'conv-3': [
		{ key: 'user-1003', role: 'user', content: 'RSC 适合什么场景？' },
		{
			key: 'ai-1003',
			role: 'ai',
			content:
				'适合数据读取密集且对首屏速度敏感的页面，能有效减少客户端 JS 负担。',
		},
	],
	'conv-4': [
		{ key: 'user-1004', role: 'user', content: '如何优化大模型推理延迟？' },
		{
			key: 'ai-1004',
			role: 'ai',
			content:
				'可以从 prompt 压缩、并行检索、流式输出与缓存命中率四个方向同时优化。',
		},
	],
};

export default function ChatContent() {
	const { address: userAddress } = useAccount();
	const { openConnectModal } = useConnectModal();
	const [value, setValue] = useState('');
	const [thinking, setThinking] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [currentAiKey, setCurrentAiKey] = useState<string | null>(null);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const wasConnectedRef = useRef(Boolean(userAddress));
	const streamAbortRef = useRef<AbortController | null>(null);
	const conversationRef = useRef<HTMLDivElement | null>(null);
	const pendingScrollRef = useRef(false);
	const messageIdRef = useRef(0);
	const activeStreamTokenRef = useRef(0);
	const hasUserMessageRef = useRef(false);

	const renderMarkdownContent = useCallback((text: string) => {
		if (!text) return null;

		return (
			<div className='chat-markdown whitespace-normal break-words text-sm leading-6'>
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						p: ({ children }) => <p className='mb-2 last:mb-0'>{children}</p>,
						strong: ({ children }) => (
							<strong className='font-semibold'>{children}</strong>
						),
						em: ({ children }) => <em className='italic'>{children}</em>,
						ul: ({ children }) => (
							<ul className='mb-2 list-disc pl-5'>{children}</ul>
						),
						ol: ({ children }) => (
							<ol className='mb-2 list-decimal pl-5'>{children}</ol>
						),
						li: ({ children }) => <li className='mb-1'>{children}</li>,
						code: ({ children, className }) =>
							className ? (
								<code className='block overflow-x-auto rounded-xl bg-black/5 p-3 font-mono text-xs leading-5'>
									{children}
								</code>
							) : (
								<code className='rounded bg-black/5 px-1 py-0.5 font-mono text-[0.9em]'>
									{children}
								</code>
							),
						table: ({ children }) => (
							<div className='my-3 overflow-x-auto rounded-xl border border-black/10'>
								<table className='w-full border-collapse text-left text-sm'>
									{children}
								</table>
							</div>
						),
						thead: ({ children }) => (
							<thead className='bg-black/5'>{children}</thead>
						),
						th: ({ children }) => (
							<th className='border-b border-black/10 px-3 py-2 font-semibold'>
								{children}
							</th>
						),
						td: ({ children }) => (
							<td className='border-b border-black/10 px-3 py-2 align-top'>
								{children}
							</td>
						),
						blockquote: ({ children }) => (
							<blockquote className='border-l-4 border-black/10 pl-3 italic text-black/70'>
								{children}
							</blockquote>
						),
					}}
				>
					{text}
				</ReactMarkdown>
			</div>
		);
	}, []);

	const bubbleItems = useMemo<BubbleItemType[]>(
		() =>
			messages.map((message) => ({
				...message,
				content:
					message.role === 'ai'
						? renderMarkdownContent(message.content)
						: message.content,
			})),
		[messages, renderMarkdownContent],
	);

	const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
		const container = conversationRef.current;
		if (!container) return;

		const bubbleScrollBox = container.querySelector<HTMLElement>(
			'.ant-bubble-list-scroll-box',
		);
		const scrollTarget = bubbleScrollBox ?? container;

		scrollTarget.scrollTo({
			top: scrollTarget.scrollHeight,
			behavior,
		});
	}, []);

	const scheduleScrollToLatest = useCallback(
		(behavior: ScrollBehavior = 'auto') => {
			window.requestAnimationFrame(() => {
				window.requestAnimationFrame(() => {
					scrollToLatest(behavior);
				});
			});
		},
		[scrollToLatest],
	);

	const clearAllTimers = useCallback(() => {
		activeStreamTokenRef.current += 1;
		if (streamAbortRef.current) {
			streamAbortRef.current.abort();
			streamAbortRef.current = null;
		}
	}, []);

	useEffect(() => {
		return () => {
			clearAllTimers();
		};
	}, [clearAllTimers]);

	useEffect(() => {
		hasUserMessageRef.current = messages.some((m) => m.role === 'user');
	}, [messages]);

	// 处理钱包断开连接：刷新页面回到首页
	useEffect(() => {
		if (userAddress) {
			wasConnectedRef.current = true;
			return;
		}

		if (wasConnectedRef.current) {
			window.location.href = '/';
		}
	}, [userAddress]);

	useEffect(() => {
		const handleNewConversation = (event: Event) => {
			const customEvent = event as CustomEvent<SidebarNewConversationDetail>;
			if (!customEvent.detail?.key) return;

			clearAllTimers();
			setValue('');
			setThinking(false);
			setGenerating(false);
			setCurrentAiKey(null);
			setMessages([]);
		};

		window.addEventListener(
			SIDEBAR_NEW_CONVERSATION_EVENT,
			handleNewConversation,
		);
		return () => {
			window.removeEventListener(
				SIDEBAR_NEW_CONVERSATION_EVENT,
				handleNewConversation,
			);
		};
	}, [clearAllTimers]);

	useEffect(() => {
		const handleActiveConversation = (event: Event) => {
			const customEvent = event as CustomEvent<SidebarActiveConversationDetail>;
			const conversationKey = customEvent.detail?.key;
			if (!conversationKey) return;

			const mockMessages = MOCK_CONVERSATION_MESSAGES[conversationKey];
			if (!mockMessages) return;

			clearAllTimers();
			setValue('');
			setThinking(false);
			setGenerating(false);
			setCurrentAiKey(null);
			setMessages(mockMessages);
			pendingScrollRef.current = true;
		};

		window.addEventListener(
			SIDEBAR_ACTIVE_CONVERSATION_EVENT,
			handleActiveConversation,
		);
		return () => {
			window.removeEventListener(
				SIDEBAR_ACTIVE_CONVERSATION_EVENT,
				handleActiveConversation,
			);
		};
	}, [clearAllTimers]);

	const sendMessage = useCallback(
		async (raw: string) => {
			const text = raw.trim();
			if (!text) return;
			if (!userAddress) {
				openConnectModal?.();
				return;
			}
			if (generating) return;

			if (!hasUserMessageRef.current) {
				window.dispatchEvent(
					new CustomEvent(CHAT_FIRST_USER_MESSAGE_EVENT, {
						detail: { text },
					}),
				);
			}

			pendingScrollRef.current = true;

			clearAllTimers();

			const timeId = String(++messageIdRef.current);
			const streamToken = ++activeStreamTokenRef.current;
			const userKey = `${USER_KEY_PREFIX}${timeId}`;
			const aiKey = `${AI_KEY_PREFIX}${timeId}`;

			setValue('');
			setThinking(true);
			setGenerating(true);
			setCurrentAiKey(aiKey);
			setMessages((prev) => [
				...prev,
				{ key: userKey, role: 'user', content: text },
				{ key: aiKey, role: 'ai', content: '', reasoning: '', streaming: true },
			]);
			scheduleScrollToLatest('auto');

			const abortController = new AbortController();
			streamAbortRef.current = abortController;

			const applyChunk = (chunk: {
				type: 'thinking' | 'response' | 'error' | 'done';
				content?: string;
			}) => {
				if (activeStreamTokenRef.current !== streamToken) return;

				switch (chunk.type) {
					case 'thinking':
						setThinking(true);
						if (!chunk.content) return;
						setMessages((prev) =>
							prev.map((item) =>
								item.key === aiKey
									? {
											...item,
											reasoning: `${item.reasoning ?? ''}${chunk.content}`,
										}
									: item,
							),
						);
						scheduleScrollToLatest('auto');
						return;
					case 'response':
						setThinking(false);
						if (!chunk.content) return;
						setMessages((prev) =>
							prev.map((item) =>
								item.key === aiKey
									? {
											...item,
											content: `${item.content}${chunk.content}`,
										}
									: item,
							),
						);
						scheduleScrollToLatest('auto');
						return;
					case 'error':
						setThinking(false);
						setMessages((prev) =>
							prev.map((item) =>
								item.key === aiKey
									? {
											...item,
											content:
												item.content || chunk.content || '请求失败，请重试。',
										}
									: item,
							),
						);
						return;
					case 'done':
						setThinking(false);
						setGenerating(false);
						setCurrentAiKey(null);
						setMessages((prev) =>
							prev.map((item) =>
								item.key === aiKey
									? {
											...item,
											streaming: false,
										}
									: item,
							),
						);
						return;
				}
			};

			try {
				const response = await fetch('/api/agents', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						message: text,
						userAddress,
						chainId: 8453,
					}),
					signal: abortController.signal,
				});

				if (!response.ok || !response.body) {
					throw new Error(`请求失败（${response.status}）`);
				}

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const events = buffer.split('\n\n');
					buffer = events.pop() ?? '';

					for (const event of events) {
						const dataLine = event
							.split('\n')
							.find((line) => line.startsWith('data: '));
						if (!dataLine) continue;

						const payload = JSON.parse(dataLine.slice(6));
						applyChunk(payload);
					}
				}
			} catch (error) {
				if (abortController.signal.aborted) {
					return;
				}
				const errorMsg =
					error instanceof Error ? error.message : '请求失败，请稍后再试。';
				applyChunk({ type: 'error', content: errorMsg });
			} finally {
				if (streamAbortRef.current === abortController) {
					streamAbortRef.current = null;
				}
				setGenerating(false);
				setThinking(false);
				setCurrentAiKey(null);
				setMessages((prev) =>
					prev.map((item) =>
						item.key === aiKey
							? {
									...item,
									streaming: false,
								}
							: item,
					),
				);
			}
		},
		[
			clearAllTimers,
			generating,
			openConnectModal,
			scheduleScrollToLatest,
			userAddress,
		],
	);

	// 判断是否有用户消息（即是否开始对话）
	const hasUserMessage = messages.some((m) => m.role === 'user');

	useEffect(() => {
		if (!hasUserMessage) return;
		if (pendingScrollRef.current) {
			pendingScrollRef.current = false;
			scheduleScrollToLatest('smooth');
			return;
		}
		const rafId = window.requestAnimationFrame(() => {
			scrollToLatest('auto');
		});

		return () => {
			window.cancelAnimationFrame(rafId);
		};
	}, [hasUserMessage, messages, scrollToLatest, scheduleScrollToLatest]);

	const handleRetry = useCallback(
		(aiKey: string) => {
			if (generating) return;
			const sourceKey = aiKey.replace(/^ai-/, USER_KEY_PREFIX);
			const source = messages.find(
				(m) => m.key === sourceKey && m.role === 'user',
			);
			if (source?.content) {
				sendMessage(source.content);
			}
		},
		[generating, messages, sendMessage],
	);

	const handleShare = useCallback(async (text: string) => {
		if (!text) return;
		try {
			if (navigator.share) {
				await navigator.share({ text });
				return;
			}
		} catch {
			// Ignore native share cancel/error and fallback to clipboard.
		}
		if (navigator.clipboard) {
			await navigator.clipboard.writeText(text);
		}
	}, []);

	const createAiActions = useCallback(
		(data: BubbleItemType): ActionsProps['items'] => {
			const aiKey = String(data.key);
			const text = String(data.content ?? '');

			return [
				{
					key: 'copy',
					actionRender: () => <Actions.Copy text={text} />,
				},
				{
					key: 'retry',
					icon: <RedoOutlined />,
					label: '重试',
					onItemClick: () => handleRetry(aiKey),
				},
				{
					key: 'share',
					icon: <ShareAltOutlined />,
					label: '分享',
					onItemClick: () => {
						void handleShare(text);
					},
				},
			];
		},
		[handleRetry, handleShare],
	);

	const bubbleRole = useMemo(
		() => ({
			ai: (data: BubbleItemType) => {
				const isCurrentAiMessage = String(data.key) === currentAiKey;
				const isStreaming = Boolean(data.streaming);
				const isAiMessage = String(data.key).startsWith(AI_KEY_PREFIX);
				const reasoningText = String((data as ChatMessage).reasoning ?? '');

				return {
					placement: 'start' as const,
					variant: 'outlined' as const,
					typing:
						isCurrentAiMessage && isStreaming
							? {
									effect: 'typing' as const,
									step: 1,
									interval: 22,
									keepPrefix: true,
								}
							: false,
					avatar: (
						<Avatar
							size={40}
							src={favicon.src}
						/>
					),
					header: isAiMessage ? (
						<Think
							title={
								isCurrentAiMessage && thinking
									? '思考中'
									: reasoningText
										? '思考完成'
										: '思考中'
							}
							loading={isCurrentAiMessage && thinking}
							defaultExpanded={false}
							style={{ marginBottom: 8 }}
						>
							{reasoningText ? (
								<div className='whitespace-pre-wrap text-xs leading-5'>
									{reasoningText}
								</div>
							) : undefined}
						</Think>
					) : undefined,
					footer:
						isAiMessage && String(data.content ?? '') && !isStreaming ? (
							<Actions
								items={createAiActions(data)}
								variant='borderless'
								fadeInLeft
							/>
						) : undefined,
					footerPlacement: 'outer-start' as const,
				};
			},
			user: { placement: 'end' as const, variant: 'filled' as const },
			system: { variant: 'borderless' as const },
		}),
		[createAiActions, currentAiKey, thinking],
	);

	const handleCancel = useCallback(() => {
		clearAllTimers();
		setThinking(false);
		setGenerating(false);
		setCurrentAiKey(null);
		const activeAiKey = currentAiKey;
		setMessages((prev) =>
			prev.map((item) =>
				item.key === activeAiKey
					? {
							...item,
							streaming: false,
						}
					: item,
			),
		);
	}, [clearAllTimers, currentAiKey]);

	return (
		<div className='flex-1 min-h-0 px-4 pb-4 flex flex-col gap-3'>
			{/* 内容区：包含 Prompts 或对话框 */}
			<div className='mx-auto flex flex-1 w-full max-w-md sm:max-w-2xl lg:max-w-4xl flex-col min-h-0'>
				{/* 未开始对话时：Prompts 垂直居中 */}
				{!hasUserMessage && <Prompt onItemClick={sendMessage} />}

				{/* 开始对话后：显示对话框 */}
				{hasUserMessage && (
					<div
						ref={conversationRef}
						className='conversation-scroll-area min-h-0 flex-1 overflow-y-auto rounded-2xl p-3 flex flex-col gap-4'
						style={{
							background: 'var(--app-panel)',
							scrollbarGutter: 'stable',
						}}
					>
						<Bubble.List
							items={bubbleItems}
							autoScroll={false}
							role={bubbleRole}
						/>
					</div>
				)}
			</div>

			{/* 输入框固定在底部 */}
			<div
				className='mx-auto w-full max-w-md sm:max-w-2xl lg:max-w-4xl rounded-2xl p-2 flex-shrink-0 border [border-color:var(--app-border)]'
				style={{
					background: 'var(--app-panel)',
				}}
			>
				<ChatSender
					value={value}
					onChangeAction={setValue}
					onSubmitAction={sendMessage}
					loading={generating}
					onCancelAction={handleCancel}
				/>
			</div>
		</div>
	);
}
