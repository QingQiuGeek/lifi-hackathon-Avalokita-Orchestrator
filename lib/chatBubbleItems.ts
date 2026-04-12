import type { ReactNode } from 'react';

export type ChatBubbleMessage = {
	key: string;
	role: 'user' | 'ai' | 'system';
	content: string;
	reasoning?: string;
	streaming?: boolean;
};

export type ChatBubbleItem = {
	key: string;
	role: ChatBubbleMessage['role'];
	content: string | ReactNode;
	extraInfo: ChatBubbleMessage;
};

export function buildChatBubbleItems(
	messages: ChatBubbleMessage[],
	renderAiContent: (message: ChatBubbleMessage) => string | ReactNode,
): ChatBubbleItem[] {
	return messages.map((message) => ({
		key: message.key,
		role: message.role,
		content:
			message.role === 'ai' ? renderAiContent(message) : message.content,
		extraInfo: message,
	}));
}
