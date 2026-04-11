'use client';

import Image from 'next/image';
import {
	Dropdown,
	DropdownItem,
	DropdownMenu,
	DropdownPopover,
	DropdownTrigger,
	IconPlus,
} from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import questionIcon from '@/app/question.png';
import Login from './Login';

type ModelOption = {
	key: string;
	name: string;
	description: string;
};

const MODEL_OPTIONS: ModelOption[] = [
	{ key: 'gpt-4o', name: 'GPT-4o', description: '通用多模态，响应快' },
	{ key: 'gpt-4.1', name: 'GPT-4.1', description: '复杂推理与代码优先' },
	{
		key: 'gpt-4.1-mini',
		name: 'GPT-4.1 mini',
		description: '轻量快速，成本更低',
	},
	{
		key: 'gpt-4.2-mini',
		name: 'GPT-4.2 mini',
		description: '轻量快速，成本更低',
	},
	{
		key: 'gpt-4.3-mini',
		name: 'GPT-4.3 mini',
		description: '轻量快速，成本更低',
	},
	{ key: 'o4-mini', name: 'o4-mini', description: '强推理，适合步骤规划' },
	{
		key: 'o4-mini-plus',
		name: 'o4-mini+',
		description: '强推理，适合步骤规划',
	},

	{
		key: 'o4-mini-pro',
		name: 'o4-mini Pro',
		description: '强推理，适合步骤规划',
	},
	{ key: 'o4-fast', name: 'o4-fast', description: '延迟更低，适合高频对话' },
	{ key: 'o4-coder', name: 'o4-coder', description: '代码生成与重构优化' },
	{
		key: 'o4-reasoner',
		name: 'o4-reasoner',
		description: '链路推理与复杂任务分解',
	},
];

export default function Header() {
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [selectedModelKey, setSelectedModelKey] = useState(
		MODEL_OPTIONS[0].key,
	);
	const currentTheme = theme === 'system' ? resolvedTheme : theme;

	const selectedModel = useMemo(
		() =>
			MODEL_OPTIONS.find((model) => model.key === selectedModelKey) ??
			MODEL_OPTIONS[0],
		[selectedModelKey],
	);

	const selectedKeys = useMemo(
		() => new Set([selectedModelKey]),
		[selectedModelKey],
	);

	// 主题切换函数
	const toggleTheme = () => {
		setTheme(currentTheme === 'dark' ? 'light' : 'dark');
	};

	useEffect(() => {
		if (currentTheme !== 'light' && currentTheme !== 'dark') return;

		document.cookie = `theme=${currentTheme}; path=/; max-age=31536000`;
		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute(
				'content',
				currentTheme === 'dark' ? '#212121' : '#ffffff',
			);
		}
	}, [currentTheme]);

	return (
		<header className='flex items-center justify-between px-4 h-14 sticky top-0 z-10 [background:var(--app-panel)]'>
			{/* model list */}
			<div className='flex items-center'>
				<Dropdown>
					<DropdownTrigger
						aria-label='选择模型'
						className='flex items-center gap-2 hover:bg-[var(--app-hover)] px-3 py-2 rounded-xl transition-colors text-[15px] font-semibold [color:var(--app-text)] cursor-pointer max-w-[180px]'
					>
						<span
							className='max-w-[130px] whitespace-nowrap overflow-x-auto no-scrollbar'
							title={selectedModel.name}
						>
							{selectedModel.name}
						</span>
						<svg
							width='14'
							height='14'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='[color:var(--app-muted)]'
						>
							<polyline points='6 9 12 15 18 9'></polyline>
						</svg>
					</DropdownTrigger>
					<DropdownPopover
						placement='bottom start'
						className='rounded-lg'
					>
						<DropdownMenu
							aria-label='模型列表'
							selectionMode='single'
							disallowEmptySelection
							selectedKeys={selectedKeys}
							className='min-w-[200px] max-h-[240px] overflow-y-auto p-1 rounded-none'
						>
							{MODEL_OPTIONS.map((model) => (
								<DropdownItem
									key={model.key}
									textValue={model.name}
									onAction={() => setSelectedModelKey(model.key)}
									className={`rounded-none px-3 py-3 min-h-12 transition-colors ${
										selectedModelKey === model.key
											? 'bg-[var(--app-text)] text-[var(--app-bg)] hover:bg-[var(--app-text)]'
											: 'hover:bg-[var(--app-hover)]'
									}`}
								>
									<div className='flex items-center justify-between gap-3'>
										<div className='flex min-w-0 flex-col'>
											<span
												className='text-xs font-medium truncate'
												title={model.name}
											>
												{model.name}
											</span>
											<span
												className={`text-xs truncate ${
													selectedModelKey === model.key
														? 'opacity-80'
														: 'opacity-70'
												}`}
												title={model.description}
											>
												{model.description}
											</span>
										</div>
										{selectedModelKey === model.key ? (
											<span className='text-[11px] font-semibold'>已选中</span>
										) : null}
									</div>
								</DropdownItem>
							))}
							<DropdownItem
								key='custom-model'
								textValue='自定义模型'
								className='rounded-none px-3 py-3 min-h-12 transition-colors hover:bg-[var(--app-hover)]'
							>
								<div className='flex items-center gap-3 text-xs font-medium'>
									<IconPlus />
									<span>自定义模型</span>
								</div>
							</DropdownItem>
						</DropdownMenu>
					</DropdownPopover>
				</Dropdown>
			</div>
			<div className='flex items-center gap-3 '>
				{/* Theme Toggle */}
				<button
					onClick={toggleTheme}
					className='cursor-pointer w-9 h-9 rounded-full border-none outline-none ring-0 hover:bg-[var(--app-hover)] [color:var(--app-muted)] transition-colors'
				>
					<span className='theme-icon-moon'>🌙</span>
					<span className='theme-icon-sun'>☀️</span>
				</button>

				{/* User Actions */}
				<button
					aria-label='Help'
					className='cursor-pointer w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--app-hover)] [color:var(--app-muted)] transition-colors'
				>
					<Image
						src={questionIcon}
						alt='Help'
						width={18}
						height={18}
						className='theme-adaptive-icon'
					/>
				</button>

				{/* Sign Up/in */}
				<Login />
			</div>
		</header>
	);
}
