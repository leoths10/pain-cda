<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Flèches d'un calque : partent d'une annotation et pointent vers une cible
 * (application VTOM, traitement, ou autre annotation).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arrows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_doc_id')
                ->constrained('plan_docs')
                ->cascadeOnDelete();
            $table->foreignId('from_annotation_id')
                ->constrained('annotations')
                ->cascadeOnDelete();
            $table->string('target_type', 16);          // app | job | annotation
            $table->string('target_ref');               // clé VTOM, ou uid d'annotation
            $table->string('color', 16)->default('#ef4444');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arrows');
    }
};
