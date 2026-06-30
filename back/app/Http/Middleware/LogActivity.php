<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Les routes auth/* sont loggées directement dans AuthController (login/logout)
        if (str_starts_with($request->path(), 'api/auth/')) {
            return $response;
        }

        $user = $request->user();
        if ($user) {
            Log::channel('activity')->info('request', [
                'uid'    => $user->uid,
                'name'   => $user->name,
                'method' => $request->method(),
                'path'   => $request->path(),
                'ip'     => $request->ip(),
                'status' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }
}