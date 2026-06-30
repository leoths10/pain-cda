<?php

namespace App\Logging;

use DateTimeZone;
use Illuminate\Log\Logger;

class SetTimezone
{
    public function __invoke(Logger $logger): void
    {
        $logger->getLogger()->setTimezone(new DateTimeZone('Europe/Paris'));
    }
}