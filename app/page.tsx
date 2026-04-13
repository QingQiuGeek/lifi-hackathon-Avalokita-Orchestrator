/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
'use client';

import { type ComponentType, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ChatContent from '@/components/ChatContent';
import {
	BellRing,
	Brain,
	Check,
	Droplet,
	Eye,
	Hand,
	Route,
	Settings,
	Shield,
	Sparkles,
	Wallet,
	Zap,
} from 'lucide-react';

const navItems = [
	{ id: 'dashboard', icon: Wallet, label: 'Jewel-Holder' },
	{ id: 'analytics', icon: Eye, label: 'Wisdom-Eye' },
	{ id: 'vaults', icon: Shield, label: 'Abhaya-Giver' },
	{ id: 'agent', icon: Brain, label: 'Agent' },
	{ id: 'router', icon: Route, label: 'Avatar-Router' },
	{ id: 'refinery', icon: Droplet, label: 'Amrita-Refinery' },
	{ id: 'executor', icon: Zap, label: 'Vajra-Executor' },
] as const;

function ShellCard({
	label,
	title,
	desc,
	icon: Icon,
	highlight,
}: {
	label: string;
	title: string;
	desc: string;
	icon: ComponentType<{ className?: string }>;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-3xl p-7 border shadow-lg ${highlight ? 'bg-primary text-surface border-accent-gold/30' : 'bg-surface-container-lowest border-accent-gold/10'}`}
		>
			<div className='flex items-start justify-between gap-4'>
				<div>
					<p
						className={`text-[10px] font-label uppercase tracking-[0.2em] font-bold ${highlight ? 'text-surface/70' : 'text-accent-gold'}`}
					>
						{label}
					</p>
					<h3 className='mt-2 text-2xl font-headline'>{title}</h3>
				</div>
				<div
					className={`rounded-2xl p-3 ${highlight ? 'bg-surface/15' : 'bg-accent-gold/10'}`}
				>
					<Icon
						className={`w-6 h-6 ${highlight ? 'text-surface' : 'text-accent-gold'}`}
					/>
				</div>
			</div>
			<p
				className={`mt-6 text-sm leading-relaxed ${highlight ? 'text-surface/80' : 'text-on-surface-variant'}`}
			>
				{desc}
			</p>
		</div>
	);
}

export default function Home() {
	const [currentView, setCurrentView] = useState('dashboard');

	return (
		<div className='min-h-screen relative overflow-x-hidden bg-surface text-on-surface selection:bg-accent-gold/30'>
			<div className='fixed inset-0 pointer-events-none z-0 overflow-hidden'>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
					className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vmax] h-[120vmax] opacity-[0.03]'
				>
					{[...Array(24)].map((_, i) => (
						<div
							key={i}
							style={{
								transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
							}}
							className='absolute top-1/2 left-1/2 w-full h-[1px] bg-accent-gold'
						/>
					))}
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							style={{ width: `${(i + 1) * 30}%`, height: `${(i + 1) * 30}%` }}
							className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-accent-gold rounded-full'
						/>
					))}
				</motion.div>
				<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vmax] h-[150vmax] opacity-10'>
					{[...Array(12)].map((_, i) => (
						<motion.div
							key={i}
							initial={{ rotate: i * 30, scale: 0.8, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ duration: 2, delay: i * 0.1, ease: 'easeOut' }}
							className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-gradient-to-r from-transparent via-accent-gold to-transparent'
						/>
					))}
				</div>
				<div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-accent-gold/5 blur-[120px]' />
			</div>

			<motion.div
				initial={{ opacity: 0, scale: 1.1 }}
				animate={{ opacity: 0.08, scale: 1 }}
				transition={{ duration: 3 }}
				className='fixed bottom-[-10%] left-[-10%] w-[60%] pointer-events-none z-0'
			>
				<img
					className='w-full h-auto'
					alt='a large elegant line art illustration of a blooming lotus flower'
					src='https://lh3.googleusercontent.com/aida-public/AB6AXuC3YpnY9flUgdIGfJfahlZkoSL-fu3LeFRJFCVGQ5mGvPpwEM_Ptim-53e49OX06-iDuOiedUFtP9cTT7mAJRRL1G7R1GkEhjdVQOyzRrsnzyXw3MpGQslfgZBDOpxcLfBvVDhzZRrIBJj_QbrnH8iwdsEuLevyuOFl1JqTbMIXlDEWCsyd28OuMzNXroUjrdgShwSwaSG7wLjC92VXTYYvz-WTwZCfCo-VKUE3629YuH1pw1k4avmbFU36KU_viJwI_1nkorpwZoa6'
				/>
			</motion.div>

			<aside className='h-screen w-64 fixed left-0 top-0 bg-stone-100/80 dark:bg-stone-900/80 backdrop-blur-xl border-r border-accent-gold/10 shadow-2xl flex flex-col py-8 px-4 z-50'>
				<div className='mb-10 px-2'>
					<div className='flex items-center gap-3'>
						<motion.div
							whileHover={{ scale: 1.1, rotate: 360 }}
							transition={{ duration: 0.8, ease: 'anticipate' }}
							className='w-14 h-14 bg-[#0a192f] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] overflow-hidden border-2 border-accent-gold/50'
						>
							<img
								src='https://lh3.googleusercontent.com/aida-public/AB6AXuC3YpnY9flUgdIGfJfahlZkoSL-fu3LeFRJFCVGQ5mGvPpwEM_Ptim-53e49OX06-iDuOiedUFtP9cTT7mAJRRL1G7R1GkEhjdVQOyzRrsnzyXw3MpGQslfgZBDOpxcLfBvVDhzZRrIBJj_QbrnH8iwdsEuLevyuOFl1JqTbMIXlDEWCsyd28OuMzNXroUjrdgShwSwaSG7wLjC92VXTYYvz-WTwZCfCo-VKUE3629YuH1pw1k4avmbFU36KU_viJwI_1nkorpwZoa6'
								alt='Thousand-Hand Guanyin'
								className='w-full h-full object-cover'
								referrerPolicy='no-referrer'
							/>
						</motion.div>
						<div>
							<h1 className='text-2xl font-headline text-emerald-900 dark:text-emerald-100 italic tracking-tight'>
								Avalokita
							</h1>
							<p className='text-[10px] font-label uppercase tracking-widest text-accent-gold font-bold'>
								Orchestrator v1.0
							</p>
						</div>
					</div>
				</div>

				<nav className='flex-1 space-y-1'>
					{navItems.map((item) => (
						<motion.button
							key={item.id}
							onClick={() => setCurrentView(item.id)}
							whileHover={{ x: 4 }}
							className={`w-full flex items-center gap-3 px-3 py-3 transition-all rounded-lg group ${
								currentView === item.id
									? 'text-emerald-900 dark:text-emerald-200 font-bold bg-accent-gold/10 border-r-4 border-accent-gold'
									: 'text-stone-500 dark:text-stone-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
							}`}
						>
							<item.icon
								className={`w-5 h-5 ${currentView === item.id ? 'text-accent-gold' : 'group-hover:text-accent-gold'}`}
							/>
							<span className='font-headline italic tracking-tight text-sm'>
								{item.label}
							</span>
						</motion.button>
					))}
				</nav>

				<div className='mt-auto space-y-6'>
					<button
						onClick={() => setCurrentView('new-strategy')}
						className={`w-full py-4 rounded-xl bg-gradient-to-r from-primary to-primary-container text-surface font-label text-sm font-semibold shadow-lg hover:opacity-90 transition-opacity ${currentView === 'new-strategy' ? 'ring-2 ring-accent-gold ring-offset-2 ring-offset-stone-900' : ''}`}
					>
						New Strategy
					</button>
					<div className='space-y-1'>
						<button
							onClick={() => setCurrentView('settings')}
							className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-label transition-colors ${currentView === 'settings' ? 'text-accent-gold font-bold' : 'text-stone-500 dark:text-stone-400 hover:text-primary'}`}
						>
							<Settings className='w-5 h-5' />
							<span>Settings</span>
						</button>
						<button
							onClick={() => setCurrentView('insights')}
							className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-label transition-colors ${currentView === 'insights' ? 'text-accent-gold font-bold' : 'text-stone-500 dark:text-stone-400 hover:text-primary'}`}
						>
							<Brain className='w-5 h-5' />
							<span>Insights</span>
						</button>
					</div>
				</div>
			</aside>

			<header className='fixed top-0 right-0 w-[calc(100%-16rem)] h-16 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-200/20 dark:border-stone-800/20 flex justify-between items-center px-8 z-40'>
				<div className='flex items-center gap-4'>
					<span className='text-xl font-headline font-bold text-stone-900 dark:text-stone-100'>
						Avalokita Orchestrator
					</span>
					<span className='bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-full font-label font-bold border border-primary/20'>
						PRODUCTION-READY
					</span>
				</div>

				<div className='flex items-center gap-8'>
					<nav className='hidden md:flex gap-6'>
						<button
							onClick={() => setCurrentView('dashboard')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'dashboard' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Dashboard
						</button>
						<button
							onClick={() => setCurrentView('analytics')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'analytics' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Analytics
						</button>
						<button
							onClick={() => setCurrentView('vaults')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'vaults' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Vaults
						</button>
						<button
							onClick={() => setCurrentView('agent')}
							className={`font-body uppercase text-xs tracking-widest py-1 transition-all ${currentView === 'agent' ? 'text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-700' : 'text-stone-400 dark:text-stone-500 hover:text-emerald-600'}`}
						>
							Agent
						</button>
					</nav>

					<div className='h-6 w-[1px] bg-outline-variant/30'></div>

					<div className='flex items-center gap-4'>
						<span className='text-[11px] font-label text-secondary italic'>
							Dominic's Thoughts: The market flows like water.
						</span>
						<div className='flex items-center gap-3'>
							<BellRing className='w-5 h-5 text-emerald-700 cursor-pointer' />
							<div className='w-8 h-8 rounded-full bg-surface-container overflow-hidden border border-outline-variant/30'>
								<img
									className='w-full h-full object-cover'
									alt='portrait of a focused professional with soft lighting and minimalist background'
									src='https://lh3.googleusercontent.com/aida-public/AB6AXuAW_x0pLNjz36Ss14x2xOyLoPz7Z3EyqC5CtydvD8H52w8b_zH7nVSKCPhKkhvvmcClxrvnO12vvkBVcbrn13MFKio92wJbSl0CPPHTddWl4Ni_IPFq0Qj0iwznLfoJ21O_wKkZrrGeTnvIDEleupocoQOzxePqUxYvmlAcpH9sWUCwCZAnVSb3a_HftHCQHDzYKap1nH57KUD5ZBQpZTqPghuWGyucMGWhFPmAp2d8w-NfdEQq8yBg_DgNvE9cE6_ht7gnlWVPGRMd'
								/>
							</div>
						</div>
					</div>
				</div>
			</header>

			<main className='pl-64 pt-16 min-h-screen z-10 relative'>
				<AnimatePresence mode='wait'>
					{currentView === 'agent' && (
						<motion.div
							key='agent'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='h-[calc(100vh-4rem)] overflow-hidden'
						>
							<div className='flex h-full w-full [background:var(--app-bg)] [color:var(--app-text)] antialiased overflow-hidden'>
								<Sidebar />
								<main className='flex-1 flex flex-col relative min-w-0 [background:var(--app-panel)]'>
									<Header />
									<ChatContent />
								</main>
							</div>
						</motion.div>
					)}

					{currentView === 'dashboard' && (
						<motion.div
							key='dashboard'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<motion.section
								initial={{ y: 20, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								className='bg-surface-container rounded-3xl p-8 relative overflow-hidden border border-accent-gold/10 shadow-xl gold-glow'
							>
								<div className='absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-accent-gold/10 to-transparent'></div>
								<div className='relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
									<div className='max-w-2xl'>
										<div className='flex items-center gap-2 mb-4'>
											<Hand className='w-5 h-5 text-accent-gold' />
											<span className='text-[10px] font-label font-bold uppercase tracking-[0.2em] text-accent-gold'>
												Infinite Compassion & Power
											</span>
										</div>
										<h2 className='text-4xl font-headline text-on-surface mb-3 leading-tight'>
											The{' '}
											<span className='text-accent-gold italic'>
												Thousand-Hand
											</span>{' '}
											Orchestrator
										</h2>
										<p className='text-on-surface-variant font-body text-lg leading-relaxed'>
											A divine gateway to liquid markets, high-frequency AI
											strategies, and enlightened vault management.
										</p>
									</div>
									<motion.div
										whileHover={{ scale: 1.02 }}
										className='bg-surface-container-lowest/80 backdrop-blur border border-accent-gold/20 p-5 rounded-2xl max-w-xs shadow-lg'
									>
										<div className='flex items-center gap-2 text-accent-gold mb-2'>
											<Sparkles className='w-4 h-4' />
											<span className='text-[10px] font-label font-bold uppercase tracking-tighter'>
												DIVINE INSIGHT
											</span>
										</div>
										<p className='text-sm italic text-on-surface-variant leading-relaxed'>
											"The flow of capital is but a ripple in the ocean of
											wisdom. Align your intent with the market's natural
											dharma."
										</p>
									</motion.div>
								</div>
							</motion.section>

							<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
								<ShellCard
									label='Jewel-Holder'
									title='Integrated Wallets'
									desc='Wallet visibility and balance management across the orchestration surface.'
									icon={Wallet}
								/>
								<ShellCard
									label='Wisdom-Eye'
									title='APY Matrix'
									desc='Yield views and protocol performance summaries for active strategies.'
									icon={Eye}
								/>
								<ShellCard
									label='Abhaya-Giver'
									title='Risk Shield'
									desc='Vault exposure and safety indicators for the current portfolio.'
									icon={Shield}
								/>
								<ShellCard
									label='Avatar-Router'
									title='Pathway Flow'
									desc='Cross-chain routing and route selection for asset movement.'
									icon={Route}
								/>
								<ShellCard
									label='Amrita-Refinery'
									title='Income Analysis'
									desc='Compounding and weekly yield analysis for treasury flows.'
									icon={Droplet}
								/>
								<ShellCard
									label='Vajra-Executor'
									title='Node Execution'
									desc='Execution nodes, batching, and controlled transaction dispatch.'
									icon={Zap}
									highlight
								/>
							</div>

							<section className='bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10'>
								<div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8'>
									<div>
										<h2 className='text-2xl font-headline text-on-surface'>
											48-Hour Sprint Plan
										</h2>
										<p className='text-on-surface-variant text-sm'>
											Aggressive refinement schedule for production
											orchestration.
										</p>
									</div>
									<div className='flex bg-surface-container-low p-1 rounded-xl'>
										<button className='px-6 py-2 rounded-lg bg-surface text-primary font-bold text-sm shadow-sm'>
											Day 1
										</button>
										<button className='px-6 py-2 rounded-lg text-stone-400 font-bold text-sm hover:text-primary transition-colors'>
											Day 2
										</button>
									</div>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
									<div className='space-y-4'>
										<div className='flex items-start gap-4 p-4 bg-primary/5 rounded-xl border-l-4 border-primary'>
											<div className='w-6 h-6 rounded-full border-2 border-primary flex items-center justify-center shrink-0 mt-1'>
												<Check className='w-3 h-3 text-primary' />
											</div>
											<div>
												<h4 className='font-bold font-body text-sm'>
													Asset Protocol Verification
												</h4>
												<p className='text-xs text-on-surface-variant mt-1'>
													Audit all L1/L2 bridge endpoints for maximum liquidity
													depth.
												</p>
											</div>
										</div>
										<div className='flex items-start gap-4 p-4 hover:bg-stone-50 transition-colors rounded-xl'>
											<div className='w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center shrink-0 mt-1'></div>
											<div>
												<h4 className='font-bold font-body text-sm text-on-surface'>
													Shard Synchronization
												</h4>
												<p className='text-xs text-stone-500 mt-1'>
													Connect all 48 execution nodes to the Vajra core
													engine.
												</p>
											</div>
										</div>
									</div>
									<div className='space-y-4'>
										<div className='flex items-start gap-4 p-4 hover:bg-stone-50 transition-colors rounded-xl'>
											<div className='w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center shrink-0 mt-1'></div>
											<div>
												<h4 className='font-bold font-body text-sm text-on-surface'>
													Oracle Sensitivity Calibration
												</h4>
												<p className='text-xs text-stone-500 mt-1'>
													Tune Wisdom-Eye matrix to filter low-confidence market
													noise.
												</p>
											</div>
										</div>
										<div className='flex items-start gap-4 p-4 hover:bg-stone-50 transition-colors rounded-xl'>
											<div className='w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center shrink-0 mt-1'></div>
											<div>
												<h4 className='font-bold font-body text-sm text-on-surface'>
													Final Stress Test
												</h4>
												<p className='text-xs text-stone-500 mt-1'>
													Simulate 500% spike in transaction volume for
													stability check.
												</p>
											</div>
										</div>
									</div>
								</div>
							</section>
						</motion.div>
					)}

					{currentView === 'analytics' && (
						<motion.div
							key='analytics'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<h2 className='text-4xl font-headline text-on-surface'>
								Wisdom-Eye Analytics
							</h2>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
								<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl'>
									<h3 className='text-xl font-headline text-accent-gold mb-4'>
										Performance Matrix
									</h3>
									<div className='h-64 bg-stone-900/50 rounded-xl flex items-center justify-center border border-accent-gold/5'>
										<span className='text-stone-500 italic'>
											Visualizing market flows...
										</span>
									</div>
								</div>
								<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl'>
									<h3 className='text-xl font-headline text-accent-gold mb-4'>
										Yield Distribution
									</h3>
									<div className='h-64 bg-stone-900/50 rounded-xl flex items-center justify-center border border-accent-gold/5'>
										<span className='text-stone-500 italic'>
											Calculating enlightened returns...
										</span>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{currentView === 'vaults' && (
						<motion.div
							key='vaults'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<h2 className='text-4xl font-headline text-on-surface'>
								Abhaya-Giver Vaults
							</h2>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
								{['Lotus Vault', 'Vajra Safe', 'Amrita Pool'].map((vault) => (
									<div
										key={vault}
										className='bg-surface-container rounded-2xl p-6 border border-accent-gold/10 hover:border-accent-gold/30 transition-all'
									>
										<Shield className='w-8 h-8 text-accent-gold mb-4' />
										<h3 className='text-lg font-headline mb-2'>{vault}</h3>
										<p className='text-sm text-stone-500 mb-4'>
											Secured by divine encryption and multi-sig dharma.
										</p>
										<button className='w-full py-2 rounded-lg bg-accent-gold/10 text-accent-gold font-bold text-xs uppercase tracking-widest'>
											Manage
										</button>
									</div>
								))}
							</div>
						</motion.div>
					)}

					{currentView === 'router' && (
						<motion.div
							key='router'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<div className='flex justify-between items-end'>
								<div>
									<h2 className='text-4xl font-headline text-on-surface'>
										Avatar-Router
									</h2>
									<p className='text-stone-500 mt-2 italic'>
										Mapping the divine flow of assets across 108 dimensions.
									</p>
								</div>
								<div className='bg-accent-gold/10 px-4 py-2 rounded-full border border-accent-gold/20 flex items-center gap-2'>
									<div className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></div>
									<span className='text-[10px] font-label font-bold text-accent-gold uppercase'>
										Active Routes: 12
									</span>
								</div>
							</div>
							<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
								<div className='lg:col-span-2 bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl relative overflow-hidden'>
									<h3 className='text-xl font-headline text-accent-gold mb-6'>
										Current Pathway Flow
									</h3>
									<div className='h-56 rounded-2xl border border-accent-gold/5 bg-stone-950/40 flex items-center justify-center text-stone-500 italic'>
										Route visualization goes here.
									</div>
								</div>
								<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl'>
									<h3 className='text-xl font-headline text-accent-gold mb-6'>
										Route Optimizer
									</h3>
									<div className='space-y-4'>
										{['Lowest Fee', 'Fastest Path', 'Max Security'].map(
											(opt, i) => (
												<div
													key={opt}
													className={`p-4 rounded-2xl border ${i === 0 ? 'bg-accent-gold/10 border-accent-gold' : 'bg-stone-900/20 border-stone-800'}`}
												>
													<div className='flex justify-between items-center'>
														<span className='text-sm font-bold'>{opt}</span>
														{i === 0 && (
															<Check className='w-4 h-4 text-accent-gold' />
														)}
													</div>
													<p className='text-[10px] text-stone-500 mt-1'>
														Optimizing for enlightened efficiency.
													</p>
												</div>
											),
										)}
									</div>
									<button className='w-full mt-8 py-4 rounded-xl bg-accent-gold text-stone-950 font-bold text-sm uppercase tracking-widest shadow-lg shadow-accent-gold/20'>
										Execute Route
									</button>
								</div>
							</div>
						</motion.div>
					)}

					{currentView === 'refinery' && (
						<motion.div
							key='refinery'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<h2 className='text-4xl font-headline text-on-surface'>
								Amrita-Refinery
							</h2>
							<div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
								{[
									{ label: 'Raw Yield', val: '14.2%', icon: Droplet },
									{ label: 'Refined APY', val: '18.5%', icon: Sparkles },
									{ label: 'Gas Saved', val: '$1,240', icon: Zap },
									{ label: 'Karma Score', val: '99.8', icon: Hand },
								].map((stat) => (
									<div
										key={stat.label}
										className='bg-surface-container rounded-2xl p-6 border border-accent-gold/10'
									>
										<stat.icon className='w-5 h-5 text-accent-gold mb-2' />
										<p className='text-[10px] font-label text-stone-500 uppercase'>
											{stat.label}
										</p>
										<p className='text-2xl font-bold text-on-surface'>
											{stat.val}
										</p>
									</div>
								))}
							</div>
							<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl'>
								<h3 className='text-xl font-headline text-accent-gold mb-6'>
									Income Refinement Process
								</h3>
								<div className='space-y-6'>
									{[
										{ step: 'Harvesting', progress: 100, status: 'Complete' },
										{
											step: 'Compounding',
											progress: 75,
											status: 'In Progress',
										},
										{
											step: 'Dharma Rebalancing',
											progress: 30,
											status: 'Queued',
										},
									].map((p) => (
										<div key={p.step}>
											<div className='flex justify-between text-xs font-label mb-2'>
												<span className='text-on-surface font-bold'>
													{p.step}
												</span>
												<span className='text-accent-gold'>
													{p.status} ({p.progress}%)
												</span>
											</div>
											<div className='w-full h-3 bg-stone-900/50 rounded-full overflow-hidden border border-accent-gold/5'>
												<motion.div
													initial={{ width: 0 }}
													animate={{ width: `${p.progress}%` }}
													transition={{ duration: 1.5 }}
													className='h-full bg-gradient-to-r from-accent-gold/40 to-accent-gold shadow-[0_0_10px_rgba(212,175,55,0.3)]'
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						</motion.div>
					)}

					{currentView === 'executor' && (
						<motion.div
							key='executor'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<div className='flex items-center justify-between'>
								<h2 className='text-4xl font-headline text-on-surface'>
									Vajra-Executor
								</h2>
								<div className='flex gap-4'>
									<div className='flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20'>
										<div className='w-2 h-2 rounded-full bg-emerald-500'></div>
										<span className='text-[10px] font-bold text-emerald-500 uppercase'>
											System Nominal
										</span>
									</div>
								</div>
							</div>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
								<div className='bg-stone-950 rounded-3xl p-8 border border-accent-gold/10 shadow-2xl font-mono relative overflow-hidden'>
									<div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent-gold to-transparent opacity-50'></div>
									<h3 className='text-sm text-accent-gold mb-6 flex items-center gap-2'>
										<Zap className='w-4 h-4' /> EXECUTION_LOG_STREAM
									</h3>
									<div className='space-y-2 text-[11px] text-emerald-500/80'>
										<p>
											<span className='text-stone-600'>[01:24:07]</span>{' '}
											Initializing Vajra Core...
										</p>
										<p>
											<span className='text-stone-600'>[01:24:08]</span>{' '}
											Synchronizing 48 nodes across shards...
										</p>
										<p>
											<span className='text-stone-600'>[01:24:09]</span>{' '}
											<span className='text-accent-gold'>SUCCESS:</span> All
											nodes online.
										</p>
										<p>
											<span className='text-stone-600'>[01:24:10]</span>{' '}
											Scanning liquidity pools for arbitrage...
										</p>
										<p>
											<span className='text-stone-600'>[01:24:11]</span> Found
											opportunity in ETH/USDC (Uniswap v3)
										</p>
										<p>
											<span className='text-stone-600'>[01:24:12]</span>{' '}
											Calculating optimal path via Avatar-Router...
										</p>
										<motion.p
											animate={{ opacity: [1, 0.5, 1] }}
											transition={{ duration: 1, repeat: Infinity }}
										>
											<span className='text-stone-600'>[01:24:13]</span>{' '}
											Awaiting divine confirmation...
										</motion.p>
									</div>
								</div>
								<div className='space-y-6'>
									<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl'>
										<h3 className='text-xl font-headline text-accent-gold mb-4'>
											Node Health Map
										</h3>
										<div className='grid grid-cols-8 gap-2'>
											{[...Array(48)].map((_, i) => (
												<motion.div
													key={i}
													initial={{ scale: 0 }}
													animate={{ scale: 1 }}
													transition={{ delay: i * 0.01 }}
													className='aspect-square rounded-sm bg-emerald-500/40 border border-emerald-500/20 hover:bg-emerald-500 transition-colors cursor-help'
													title={`Node ${i + 1}: Healthy`}
												/>
											))}
										</div>
									</div>
									<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl'>
										<h3 className='text-xl font-headline text-accent-gold mb-4'>
											Manual Override
										</h3>
										<div className='flex gap-4'>
											<button className='flex-1 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all'>
												Emergency Stop
											</button>
											<button className='flex-1 py-3 rounded-xl bg-accent-gold/10 border border-accent-gold/20 text-accent-gold font-bold text-xs uppercase tracking-widest hover:bg-accent-gold hover:text-stone-950 transition-all'>
												Force Sync
											</button>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{currentView === 'settings' && (
						<motion.div
							key='settings'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-3xl mx-auto space-y-8'
						>
							<h2 className='text-4xl font-headline text-on-surface'>
								Orchestrator Settings
							</h2>
							<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl space-y-6'>
								<div className='flex items-center justify-between p-4 bg-stone-900/20 rounded-xl'>
									<div>
										<h4 className='font-bold text-sm'>Divine Mode</h4>
										<p className='text-xs text-stone-500'>
											Enable high-frequency enlightenment protocols.
										</p>
									</div>
									<div className='w-12 h-6 bg-accent-gold rounded-full relative'>
										<div className='absolute right-1 top-1 w-4 h-4 bg-white rounded-full'></div>
									</div>
								</div>
								<div className='flex items-center justify-between p-4 bg-stone-900/20 rounded-xl'>
									<div>
										<h4 className='font-bold text-sm'>
											Auto-Dharma Rebalancing
										</h4>
										<p className='text-xs text-stone-500'>
											Automatically adjust assets to maintain perfect karma.
										</p>
									</div>
									<div className='w-12 h-6 bg-stone-700 rounded-full relative'>
										<div className='absolute left-1 top-1 w-4 h-4 bg-white rounded-full'></div>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{currentView === 'new-strategy' && (
						<motion.div
							key='new-strategy'
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className='p-8 max-w-4xl mx-auto space-y-8'
						>
							<div className='text-center space-y-2'>
								<h2 className='text-4xl font-headline text-on-surface'>
									Invoke New Dharma Path
								</h2>
								<p className='text-stone-500 italic'>
									Define your intent and manifest a new AI-driven strategy.
								</p>
							</div>
							<div className='bg-accent-gold/5 border border-accent-gold/20 rounded-3xl p-8 text-center gold-glow'>
								<div className='max-w-md mx-auto space-y-4'>
									<p className='text-sm italic text-stone-400'>
										"By clicking Invoke, you align your capital with the chosen
										Dharma. The Thousand-Hand Orchestrator will begin execution
										across all shards."
									</p>
									<button className='w-full py-4 rounded-2xl bg-accent-gold text-stone-950 font-bold text-sm uppercase tracking-[0.2em] shadow-2xl shadow-accent-gold/20 hover:scale-[1.02] transition-transform'>
										Invoke Strategy
									</button>
								</div>
							</div>
						</motion.div>
					)}

					{currentView === 'insights' && (
						<motion.div
							key='insights'
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							className='p-8 max-w-7xl mx-auto space-y-8'
						>
							<h2 className='text-4xl font-headline text-on-surface'>
								Divine Insights
							</h2>
							<div className='bg-surface-container rounded-3xl p-8 border border-accent-gold/10 shadow-xl gold-glow'>
								<div className='flex items-center gap-4 mb-6'>
									<Brain className='w-10 h-10 text-accent-gold' />
									<div>
										<h3 className='text-xl font-headline'>
											AI Oracle Analysis
										</h3>
										<p className='text-sm text-stone-500'>
											Processing cosmic market data...
										</p>
									</div>
								</div>
								<p className='text-lg italic text-on-surface-variant leading-relaxed border-l-4 border-accent-gold pl-6'>
									"The current market alignment suggests a period of high
									liquidity in the Lotus sector. Consider reallocating 15% of
									Vajra reserves to capitalize on the rising tide of
									compassion."
								</p>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</main>
		</div>
	);
}
