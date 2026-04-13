'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatContent from '@/components/ChatContent';

export default function AgentPage() {
	return (
		<div className='flex h-screen w-full [background:var(--app-bg)] [color:var(--app-text)] antialiased overflow-hidden'>
			<Sidebar />
			<main className='flex-1 flex flex-col relative min-w-0 [background:var(--app-panel)]'>
				<Header />
				<ChatContent />
			</main>
		</div>
	);
}
