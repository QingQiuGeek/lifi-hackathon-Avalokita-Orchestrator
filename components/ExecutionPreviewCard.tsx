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

function renderExecutionStatus(status: ClientExecutionState['status']) {
	switch (status) {
		case 'preflighting':
			return 'Checking wallet, gas, and allowance';
		case 'awaiting_wallet_approval':
			return 'Awaiting wallet approval signature';
		case 'approving':
			return 'Approval transaction submitted';
		case 'approved':
			return 'Approval confirmed';
		case 'awaiting_wallet_execution':
			return 'Awaiting deposit signature';
		case 'submitting':
			return 'Deposit signed, waiting for on-chain confirmation';
		case 'submitted':
			return 'Deposit transaction submitted';
		case 'confirmed':
			return 'Deposit confirmed on chain';
		case 'failed':
			return 'Execution failed';
		case 'idle':
		default:
			return 'Idle';
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
				<div>Selected vault: {preview.targetVault}</div>
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
					Approval target:{' '}
					{preview.approvalAddress ? preview.approvalAddress : 'Unavailable'}
				</div>
				<div>
					Estimated gas:{' '}
					{preview.estimatedGasUsd ?? 'n/a'}
					{preview.estimatedGasNative ? ` (${preview.estimatedGasNative})` : ''}
				</div>
				<div>
					Duration:{' '}
					{preview.executionDurationSeconds == null
						? 'n/a'
						: `${preview.executionDurationSeconds}s`}
				</div>
				<div>
					Approval path:{' '}
					{executionState?.preflight
						? executionState.preflight.requiresApproval
							? 'Approval required before deposit'
							: 'Allowance already sufficient'
						: preview.requiresApproval
							? 'Allowance check required before deposit'
							: 'No approval expected'}
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
				{executionState?.preflight ? (
					<div className='rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-black/70'>
						<div>Allowance sufficient: {executionState.preflight.allowanceSufficient ? 'yes' : 'no'}</div>
						<div>Native gas sufficient: {executionState.preflight.nativeGasSufficient ? 'yes' : 'no'}</div>
					</div>
				) : null}
			</div>

			<div className='mt-4 flex flex-wrap items-center gap-3'>
				<Button
					type='primary'
					onClick={onExecute}
					disabled={!preview.canExecute}
					loading={
						executionState?.status === 'preflighting' ||
						executionState?.status === 'awaiting_wallet_approval' ||
						executionState?.status === 'approving' ||
						executionState?.status === 'awaiting_wallet_execution' ||
						executionState?.status === 'submitting' ||
						executionState?.status === 'submitted'
					}
				>
					Execute With Wallet
				</Button>
				{executionState ? (
					<span>Status: {renderExecutionStatus(executionState.status)}</span>
				) : null}
			</div>

			{executionState?.approvalTxHash ? (
				<div className='mt-3 text-xs'>
					<a
						href={executionState.explorerLinks[0]}
						target='_blank'
						rel='noreferrer'
						className='text-blue-700 underline'
					>
						Approval tx: {executionState.approvalTxHash}
					</a>
				</div>
			) : null}

			{executionState?.executionTxHash ? (
				<div className='mt-2 text-xs'>
					<a
						href={executionState.explorerLinks[executionState.approvalTxHash ? 1 : 0]}
						target='_blank'
						rel='noreferrer'
						className='text-blue-700 underline'
					>
						Deposit tx: {executionState.executionTxHash}
					</a>
				</div>
			) : null}

			{!executionState?.approvalTxHash && !executionState?.executionTxHash && executionState?.txHashes?.length ? (
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
