<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Encadrés positionnés sur le plan, rattachés à un calque.
 * `uid` est un identifiant client stable : il sert de point d'ancrage aux flèches
 * et survit au "replace" transactionnel d'une sauvegarde de calque.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_doc_id')
                ->constrained('plan_docs')
                ->cascadeOnDelete();
            $table->string('uid', 64);
            $table->text('text');
            $table->double('x');
            $table->double('y');
            $table->double('width');
            $table->double('height');
            $table->string('color', 16)->default('#fbbf24');
            $table->timestamps();

            $table->unique(['plan_doc_id', 'uid']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('annotations');
    }
};
