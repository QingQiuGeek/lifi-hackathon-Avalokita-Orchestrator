'use client';

import {
	LinkOutlined,
	RedoOutlined,
	ShareAltOutlined,
} from '@ant-design/icons';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Actions, Bubble, Think } from '@ant-design/x';
import type { ActionsProps, BubbleItemType, SourcesProps } from '@ant-design/x';
import { Avatar } from 'antd';
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
	const [sourcesMap, setSourcesMap] = useState<
		Record<string, SourcesProps['items']>
	>({});
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const wasConnectedRef = useRef(Boolean(userAddress));
	const conversationRef = useRef<HTMLDivElement | null>(null);
	const pendingScrollRef = useRef(false);
	const thinkTimeoutIdRef = useRef<number | null>(null);
	const streamStepTimeoutIdRef = useRef<number | null>(null);
	const streamFinalizeTimeoutIdRef = useRef<number | null>(null);
	const messageIdRef = useRef(0);
	const activeStreamTokenRef = useRef(0);
	const hasUserMessageRef = useRef(false);

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

	const clearStreamTimers = useCallback(() => {
		if (thinkTimeoutIdRef.current !== null) {
			window.clearTimeout(thinkTimeoutIdRef.current);
			thinkTimeoutIdRef.current = null;
		}
		if (streamStepTimeoutIdRef.current !== null) {
			window.clearTimeout(streamStepTimeoutIdRef.current);
			streamStepTimeoutIdRef.current = null;
		}
		if (streamFinalizeTimeoutIdRef.current !== null) {
			window.clearTimeout(streamFinalizeTimeoutIdRef.current);
			streamFinalizeTimeoutIdRef.current = null;
		}
	}, []);

	const clearAllTimers = useCallback(() => {
		activeStreamTokenRef.current += 1;
		clearStreamTimers();
	}, [clearStreamTimers]);

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
			setSourcesMap({});
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
			setSourcesMap({});
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

	const buildSourcesItems = useCallback(
		(query: string): SourcesProps['items'] => {
			const encoded = encodeURIComponent(query);
			return [
				{
					key: 's-1',
					title: 'Ant Design X 组件总览',
					url: 'https://ant-design-x.antgroup.com/components/overview-cn',
					icon: <LinkOutlined />,
					description: '官方组件入口与能力清单',
				},
				{
					key: 's-2',
					title: 'Bubble 对话气泡',
					url: 'https://ant-design-x.antgroup.com/components/bubble-cn',
					icon: <LinkOutlined />,
					description: '消息结构、流式传输、角色与插槽',
				},
				{
					key: 's-3',
					title: `搜索：${query}`,
					url: `https://www.bing.com/search?q=${encoded}`,
					icon: <LinkOutlined />,
					description: '外部检索结果（示例来源）',
				},
			];
		},
		[],
	);

	const sendMessage = useCallback(
		(raw: string) => {
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
			const fullReply = `关于"${text}"，我建议先从需求拆分、组件职责边界、数据流和交互状态管理四个层面设计。需要的话我可以继续给你产出可直接落地的代码版本。`;
			let streamFinished = false;

			const finishStream = (content: string) => {
				if (activeStreamTokenRef.current !== streamToken) return;
				if (streamFinished) return;
				streamFinished = true;
				setThinking(false);
				setGenerating(false);
				setMessages((prev) =>
					prev.map((item) =>
						item.key === aiKey
							? {
									...item,
									content,
									streaming: false,
								}
							: item,
					),
				);
				clearStreamTimers();
			};

			setValue('');
			setThinking(true);
			setGenerating(true);
			setCurrentAiKey(aiKey);
			setSourcesMap((prev) => ({
				...prev,
				[aiKey]: buildSourcesItems(text),
			}));
			// 先添加用户消息和 AI 占位消息（用于承载思考过程）
			setMessages((prev) => [
				...prev,
				{ key: userKey, role: 'user', content: text },
				{ key: aiKey, role: 'ai', content: '', streaming: true },
			]);
			scheduleScrollToLatest('auto');

			streamFinalizeTimeoutIdRef.current = window.setTimeout(() => {
				finishStream(fullReply);
			}, 15000);

			const thinkTimeoutId = window.setTimeout(() => {
				if (activeStreamTokenRef.current !== streamToken) return;
				if (streamFinished) return;
				thinkTimeoutIdRef.current = null;
				setThinking(false);

				let index = 0;
				const chunkSize = Math.max(1, Math.ceil(fullReply.length / 36));

				const pushChunk = () => {
					if (activeStreamTokenRef.current !== streamToken) return;
					if (streamFinished) return;

					index = Math.min(fullReply.length, index + chunkSize);
					const nextContent = fullReply.slice(0, index);
					const isDone = index >= fullReply.length;

					setMessages((prev) =>
						prev.map((item) =>
							item.key === aiKey
								? {
										...item,
										content: nextContent,
										streaming: !isDone,
									}
								: item,
						),
					);
					scheduleScrollToLatest('auto');

					if (isDone) {
						finishStream(fullReply);
						return;
					}

					streamStepTimeoutIdRef.current = window.setTimeout(pushChunk, 34);
				};

				pushChunk();
			}, 650);
			thinkTimeoutIdRef.current = thinkTimeoutId;
		},
		[
			buildSourcesItems,
			clearAllTimers,
			clearStreamTimers,
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
							title={isCurrentAiMessage && thinking ? '思考中' : '思考完成'}
							loading={isCurrentAiMessage && thinking}
							defaultExpanded={false}
							style={{ marginBottom: 8 }}
						></Think>
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
		[createAiActions, currentAiKey, sourcesMap, thinking],
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
							items={messages}
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
