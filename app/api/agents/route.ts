/**
 * API Route: POST /api/agents
 * 主入口点，接收用户消息并调用 MainAgent
 */

import { NextRequest, NextResponse } from 'next/server';
import { mainAgent } from './agents/main';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { message, userAddress, chainId } = body;

		// 验证必需字段
		if (!message || !userAddress) {
			return NextResponse.json(
				{
					success: false,
					error: 'Missing required fields: message, userAddress',
				},
				{ status: 400 },
			);
		}

		// 调用主 Agent
		const result = await mainAgent({
			userMessage: message,
			userAddress,
			chainId: chainId || 8453, // 默认 Base
		});

		return NextResponse.json({
			success: true,
			data: {
				intent: result.intent,
				chainId: result.chainId,
				response: result.response,
				timestamp: new Date().toISOString(),
			},
		});
	} catch (error) {
		console.error('Agent API error:', error);

		const errorMsg = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{
				success: false,
				error: errorMsg,
			},
			{ status: 500 },
		);
	}
}

// GET for health check
export async function GET() {
	return NextResponse.json({
		status: 'ok',
		message: 'Agent API is running',
		supportedIntents: ['earn', 'bridge', 'monitor'],
		version: '1.0.0',
	});
}
