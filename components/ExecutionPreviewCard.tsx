'use client';

import { Button } from 'antd';
import type { ExecutionPreview } from '@/lib/executionRuntime';
import type { NormalizedVaultCandidate } from '@/lib/lifiRuntime';
import type { PlannerOutput } from '@/lib/plannerRuntime';
import type { ClientExecutionState } from '@/lib/executionClient';

function chainLabel(chainId: number): string {
	switch (chainId) {
		case 1:
			return 'Ethereum';
		case 42161:
			return 'Arbitrum';
		case 8453:
		default:
			return 'Base';
	}
}

type ExecutionPreviewCardProps = {
	plan?: PlannerOutput;
	preview?: ExecutionPreview;
	selectedVault?: NormalizedVaultCandidate | null;
	alternatives?: NormalizedVaultCandidate[];
	executionState?: ClientExecutionState;
	onExecute?: () => void;
};

export default function ExecutionPreviewCard({
	plan,
	preview,
	selectedVault,
	alternatives = [],
	executionState,
	onExecute,
}: ExecutionPreviewCardProps) {
	if (!preview) {
		return null;
	}

	return (
		<div className='mt-3 rounded-2xl border border-black/10 bg-black/[0.03] p-4 text-sm'>
			<div className='font-semibold text-black'>Execution Preview</div>
			<div className='mt-3 grid gap-2 text-black/80'>
				<div>Selected vault: {selectedVault?.name ?? preview.targetVault}</div>
				<div>Protocol: {selectedVault?.protocolName ?? 'Unknown'}</div>
				<div>
					Route: {chainLabel(preview.fromChain)} {'->'}{' '}
					{chainLabel(preview.toChain)}
				</div>
				<div>
					Amount: {preview.fromAmount ? `${preview.fromAmount} ${preview.fromToken}` : 'Not provided'}
				</div>
				<div>Fees: {preview.fees}</div>
				<div>Route source: {preview.routeSource}</div>
				<div>
					Duration:{' '}
					{preview.executionDurationSeconds == null
						? 'n/a'
						: `${preview.executionDurationSeconds}s`}
				</div>
				{plan?.minApy != null ? <div>Target APY: {plan.minApy}%+</div> : null}
				{alternatives.length > 0 ? (
					<div>
						Alternatives:{' '}
						{alternatives
							.map((vault) => `${vault.name} (${vault.apyTotal.toFixed(2)}%)`)
							.join(', ')}
					</div>
				) : null}
				{preview.blockingReason ? (
					<div className='rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900'>
						{preview.blockingReason}
					</div>
				) : null}
				{executionState?.error ? (
					<div className='rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-rose-900'>
						{executionState.error}
					</div>
				) : null}
			</div>

			<div className='mt-4 flex flex-wrap items-center gap-3'>
				<Button
					type='primary'
					onClick={onExecute}
					disabled={!preview.canExecute}
					loading={
						executionState?.status === 'awaiting_wallet' ||
						executionState?.status === 'submitted'
					}
				>
					Execute With Wallet
				</Button>
				{executionState ? <span>Status: {executionState.status}</span> : null}
			</div>

			{executionState?.txHashes?.length ? (
				<div className='mt-3 grid gap-1'>
					{executionState.txHashes.map((hash, index) => (
						<a
							key={hash}
							href={executionState.explorerLinks[index]}
							target='_blank'
							rel='noreferrer'
							className='text-xs text-blue-700 underline'
						>
							{hash}
						</a>
					))}
				</div>
			) : null}
		</div>
	);
}
