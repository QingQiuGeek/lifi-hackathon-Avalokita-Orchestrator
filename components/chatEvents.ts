export const SIDEBAR_NEW_CONVERSATION_EVENT = 'chat:new-conversation';
export const SIDEBAR_ACTIVE_CONVERSATION_EVENT = 'chat:active-conversation';
export const CHAT_FIRST_USER_MESSAGE_EVENT = 'chat:first-user-message';

export type SidebarNewConversationDetail = {
	key: string;
};

export type SidebarActiveConversationDetail = {
	key: string;
};

export type ChatFirstUserMessageDetail = {
	text: string;
};
