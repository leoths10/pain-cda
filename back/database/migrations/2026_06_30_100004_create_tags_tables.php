<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tags de classement des calques + table d'association n-n `plan_doc_tag`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->string('label', 64)->unique();
            $table->string('color', 16)->default('#6b7280');
            $table->timestamps();
        });

        Schema::create('plan_doc_tag', function (Blueprint $table) {
            $table->foreignId('plan_doc_id')
                ->constrained('plan_docs')
                ->cascadeOnDelete();
            $table->foreignId('tag_id')
                ->constrained('tags')
                ->cascadeOnDelete();
            $table->primary(['plan_doc_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_doc_tag');
        Schema::dropIfExists('tags');
    }
};
