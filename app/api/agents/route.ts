/**
 * API Route: POST /api/agents
 * 主入口点，接收用户消息并调用 MainAgent
 */

import { NextRequest, NextResponse } from 'next/server';
import { mainAgentStream } from './agents/main';

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

		const encoder = new TextEncoder();

		const stream = new ReadableStream({
			start: async (controller) => {
				const send = (payload: unknown) => {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
					);
				};

				try {
					for await (const chunk of mainAgentStream({
						userMessage: message,
						userAddress,
						chainId: chainId || 8453,
					})) {
						send(chunk);
					}
				} catch (error) {
					const errorMsg =
						error instanceof Error ? error.message : 'Unknown error';
					send({ type: 'error', content: errorMsg });
				} finally {
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream; charset=utf-8',
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no',
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
