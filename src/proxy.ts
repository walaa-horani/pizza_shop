import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isStudioRoute = createRouteMatcher(['/studio(.*)']);
const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isStudioRoute(req) || isWebhookRoute(req)) return;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
